import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import "./FriendSidebar.css";

function toInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function toHandle(user) {
  if (user?.username) return `@${user.username}`;
  if (user?.email) return `@${user.email.split("@")[0]}`;
  return "";
}

function displayName(user) {
  const emailHandle = user?.email ? String(user.email).split("@")[0] : "";
  return user?.full_name || user?.username || user?.name || emailHandle || "Unknown";
}

function toJoinDate(createdAt) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return `Joined ${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
}

function normSession(s) {
  return {
    ...s,
    duration_mins: Math.max(
      0,
      parseInt(s.duration_mins ?? s.duration_minutes ?? s.duration ?? s.minutes ?? 0, 10) || 0
    ),
    started_at: s.started_at ?? s.start_time ?? s.created_at,
  };
}

function calcWeekMins(sessions) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return sessions
    .filter((s) => new Date(s.started_at || s.created_at) >= start)
    .reduce((sum, s) => sum + s.duration_mins, 0);
}

function calcStreak(sessions) {
  const days = new Set(
    sessions
      .filter((s) => s.started_at || s.created_at)
      .map((s) => new Date(s.started_at || s.created_at).toDateString())
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else break;
  }
  return streak;
}

function getActiveTask(tasks, sessions) {
  const inProgress = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "active"
  );
  if (!inProgress.length) return null;
  const today = new Date().toDateString();
  const minsById = {};
  sessions
    .filter((s) => new Date(s.started_at || s.created_at).toDateString() === today)
    .forEach((s) => {
      const id = s.task_id || s.task;
      if (id) minsById[id] = (minsById[id] || 0) + s.duration_mins;
    });
  let best = inProgress[0], bestMins = 0;
  inProgress.forEach((t) => {
    const m = minsById[t.id] || 0;
    if (m > bestMins) { bestMins = m; best = t; }
  });
  return { task: best, todayMins: minsById[best?.id] || 0 };
}

function getRecentActivity(tasks, sessions) {
  const events = [];
  tasks
    .filter((t) => t.status === "completed" || t.status === "done")
    .slice(0, 5)
    .forEach((t) =>
      events.push({ text: `Completed ${t.title}`, time: t.updated_at || t.completed_at || t.created_at })
    );
  sessions.slice(0, 5).forEach((s) => {
    const task = tasks.find((t) => t.id === (s.task_id || s.task));
    events.push({ text: `Started ${task?.title || "a session"}`, time: s.started_at || s.created_at });
  });
  events.sort((a, b) => new Date(b.time) - new Date(a.time));
  return events.slice(0, 3);
}

function normalizePresenceStatus(value) {
  const raw = String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (!raw) return "";
  if (raw === "onbreak") return "break";
  return raw;
}

function getPersistedPresence(friend) {
  const status = normalizePresenceStatus(
    friend?.status ?? friend?.presence_status ?? friend?.current_status
  );
  const task = String(friend?.current_task ?? friend?.status_task ?? "").trim();
  return { status, task };
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const h = Math.floor(diffMins / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return "yesterday";
  return `${Math.floor(h / 24)}d ago`;
}

export default function FriendSidebar({ initialSelectedFriendId = null, onSelectedFriendChange = null }) {
  const [activeTab, setActiveTab] = useState("discover");
  const [myPublicId, setMyPublicId] = useState(null);
  const [myEmail, setMyEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [sentRequests, setSentRequests] = useState(new Set());
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendStats, setFriendStats] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const autoOpenedFriendIdRef = useRef("");

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user || null;
      if (user) {
        // Look up this user's row in public.users by email
        let { data: myRow } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        // If no row exists yet, create one using the auth UUID as the id
        if (!myRow) {
          const username = user.email.split("@")[0];
          const { data: inserted } = await supabase
            .from("users")
            .insert({ id: user.id, email: user.email, username })
            .select("id")
            .maybeSingle();
          myRow = inserted;
        }

        const publicId = myRow?.id || user.id;
        setMyPublicId(publicId);
        setMyEmail(user.email);
        await loadData(publicId, user.email);
      }
      setIsLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!actionMessage) return;
    const t = setTimeout(() => setActionMessage(""), 2500);
    return () => clearTimeout(t);
  }, [actionMessage]);

  async function loadData(userId, userEmail) {
    if (!userId) return;

    const { data: friendshipsData } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    const friendships = friendshipsData || [];

    const relatedUserIds = new Set(
      friendships
        .map((f) => (f.user_id === userId ? f.friend_id : f.user_id))
        .filter(Boolean)
    );

    const accepted = friendships.filter((f) => f.status === "accepted");
    const incoming = friendships.filter(
      (f) => f.status === "pending" && f.friend_id === userId
    );
    let allUsers = [];
    const { data: userRows } = await supabase
      .from("users")
      .select("id, email, username, created_at")
      .limit(100);

    const rows = userRows || [];
    // Only filter out the current user by email — everything else is handled by button state
    allUsers = rows.filter((u) => u.email !== userEmail && !relatedUserIds.has(u.id));
    setDiscoverUsers(allUsers);

    // Load accepted friends profiles
    const friendIds = accepted.map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id
    );
    if (friendIds.length > 0) {
      let friendMap = {};
      const { data: fRows } = await supabase
        .from("users")
        .select("id, email, username, avatar_url, created_at")
        .in("id", friendIds);
      if (fRows?.length > 0) {
        fRows.forEach((p) => { friendMap[p.id] = p; });
      }
      setFriends(
        accepted.map((f) => {
          const otherId = f.user_id === userId ? f.friend_id : f.user_id;
          const profile = friendMap[otherId] || {};
          return { friendshipId: f.id, userId: otherId, name: displayName(profile), ...profile };
        })
      );
    } else {
      setFriends([]);
    }

    // Load pending request user details
    const incomingIds = incoming.map((f) => f.user_id);
    let profileMap = {};
    if (incomingIds.length > 0) {
      const { data: rows } = await supabase
        .from("users")
        .select("id, email, username, avatar_url, created_at")
        .in("id", incomingIds);
      if (rows?.length > 0) {
        rows.forEach((p) => { profileMap[p.id] = p; });
      }
    }

    setPendingRequests(
      incoming.map((f) => {
        const profile = profileMap[f.user_id] || {};
        return {
          friendshipId: f.id,
          userId: f.user_id,
          name: displayName(profile),
          ...profile,
        };
      })
    );
  }

  async function openFriendProfile(friend) {
    setSelectedFriend(friend);
    setFriendStats(null);
    setLoadingProfile(true);
    const friendId = friend.id || friend.userId;

    const [tasksRes, sessionsRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", friendId).order("created_at", { ascending: false }),
      supabase.from("study_sessions").select("*").eq("user_id", friendId).order("created_at", { ascending: false }),
    ]);

    let sessionData = sessionsRes.data || [];
    if (sessionsRes.error || sessionData.length === 0) {
      const fb = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", friendId)
        .order("created_at", { ascending: false });
      if (!fb.error && fb.data?.length > 0) sessionData = fb.data;
    }

    setFriendStats({
      tasks: tasksRes.data || [],
      sessions: sessionData.map(normSession),
    });
    setLoadingProfile(false);
  }

  useEffect(() => {
    const targetId = String(initialSelectedFriendId || '').trim();
    if (!targetId) {
      autoOpenedFriendIdRef.current = "";
      return;
    }

    if (autoOpenedFriendIdRef.current === targetId) {
      return;
    }

    const targetFriend = friends.find((friend) => {
      const id = String(friend?.userId || friend?.id || '').trim();
      return id === targetId;
    });

    if (!targetFriend) {
      return;
    }

    autoOpenedFriendIdRef.current = targetId;
    setActiveTab('friends');
    openFriendProfile(targetFriend);
  }, [friends, initialSelectedFriendId]);

  useEffect(() => {
    if (typeof onSelectedFriendChange !== 'function') {
      return;
    }

    if (!selectedFriend) {
      onSelectedFriendChange(null);
      return;
    }

    onSelectedFriendChange({
      friend: selectedFriend,
      tasks: Array.isArray(friendStats?.tasks) ? friendStats.tasks : [],
      sessions: Array.isArray(friendStats?.sessions) ? friendStats.sessions : [],
      loading: loadingProfile,
    });
  }, [selectedFriend, friendStats, loadingProfile, onSelectedFriendChange]);

  async function handleSendRequest(target) {
    if (!myPublicId) return;
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(user_id.eq.${myPublicId},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${myPublicId})`
      )
      .maybeSingle();

    if (existing) {
      setActionMessage(
        existing.status === "accepted" ? "Already friends!" : "Request already sent."
      );
      return;
    }

    const { error } = await supabase.from("friendships").insert({
      user_id: myPublicId,
      friend_id: target.id,
      status: "pending",
    });

    if (!error) {
      setSentRequests((prev) => new Set([...prev, target.id]));
      setActionMessage(`Request sent to ${displayName(target)}!`);
    } else {
      console.error("Friend request error:", error);
      setActionMessage(`Error: ${error.message || error.code || "unknown"}`);
    }
  }

  async function handleAccept(req) {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", req.friendshipId);

    if (error) {
      console.error("Friend accept error:", error);
      setActionMessage(error.message || "Could not accept.");
      return;
    }

    setActionMessage(`Now friends with ${req.name}!`);
    await loadData(myPublicId, myEmail);
  }

  async function handleDecline(req) {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", req.friendshipId);

    if (error) {
      console.error("Friend decline error:", error);
      setActionMessage(error.message || "Could not decline.");
      return;
    }

    setActionMessage("Request declined.");
    await loadData(myPublicId, myEmail);
  }

  async function handleRemoveFriend(friend) {
    if (!friend?.friendshipId) return;

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friend.friendshipId);

    if (error) {
      console.error("Friend remove error:", error);
      setActionMessage(error.message || "Could not remove friend.");
      return;
    }

    setActionMessage(`Removed ${friend.name}.`);
    if (selectedFriend?.friendshipId === friend.friendshipId) {
      setSelectedFriend(null);
      setFriendStats(null);
    }
    await loadData(myPublicId, myEmail);
  }

  const filteredUsers = searchQuery.trim()
    ? discoverUsers.filter((u) => {
      const q = searchQuery.toLowerCase();
      return (
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    })
    : discoverUsers;

  if (isLoading) return <div className="fs-loading">Loading...</div>;

  // Friend profile view
  if (selectedFriend) {
    const weekMins = friendStats ? calcWeekMins(friendStats.sessions) : 0;
    const streak = friendStats ? calcStreak(friendStats.sessions) : 0;
    const doneCount = friendStats
      ? friendStats.tasks.filter((t) => t.status === "completed" || t.status === "done").length
      : 0;
    const activeTaskInfo = friendStats
      ? getActiveTask(friendStats.tasks, friendStats.sessions)
      : null;
    const persistedPresence = getPersistedPresence(selectedFriend);
    const subtitleStatus =
      persistedPresence.status === "working"
        ? (persistedPresence.task ? `currently: ${persistedPresence.task}` : "currently: working")
        : persistedPresence.status === "break"
          ? "currently: on break"
          : persistedPresence.status === "idle"
            ? "currently: idle"
            : persistedPresence.status === "offline"
              ? "currently: offline"
              : (activeTaskInfo ? `currently: ${activeTaskInfo.task.title}` : "");
    const recentActivity = friendStats
      ? getRecentActivity(friendStats.tasks, friendStats.sessions)
      : [];
    return (
      <div className="fs-page">
        <button className="fs-back-btn" onClick={() => { setSelectedFriend(null); setFriendStats(null); }}>
          ← Back to friends
        </button>

        {actionMessage && <div className="fs-action-message">{actionMessage}</div>}

        <div className="fs-profile-main">
          <div className="fs-profile-header">
            <div className="fs-avatar fs-avatar--lg">{toInitials(selectedFriend.name)}</div>
            <div>
              <h2 className="fs-profile-name">{selectedFriend.name} — activity</h2>
              <p className="fs-profile-sub">
                Friend
                {subtitleStatus && ` · ${subtitleStatus}`}
                {activeTaskInfo?.todayMins > 0 && ` · ${activeTaskInfo.todayMins}m active`}
              </p>
            </div>
          </div>

          <div className="fs-profile-actions">
            <button
              type="button"
              className="fs-btn fs-btn--remove"
              onClick={() => handleRemoveFriend(selectedFriend)}
            >
              Remove friend
            </button>
          </div>

          {loadingProfile ? (
            <p className="fs-empty-text">Loading activity...</p>
          ) : friendStats ? (
            <>
              <div className="fs-stat-grid">
                <div className="fs-stat-card">
                  <p className="fs-stat-value">{friendStats.tasks.length}</p>
                  <p className="fs-stat-label">Tasks</p>
                </div>
                <div className="fs-stat-card">
                  <p className="fs-stat-value">{doneCount}</p>
                  <p className="fs-stat-label">Done</p>
                </div>
                <div className="fs-stat-card">
                  <p className="fs-stat-value">
                    {weekMins >= 60 ? (
                      <>{Math.floor(weekMins / 60)}h{weekMins % 60 > 0 && <><br />{weekMins % 60}m</>}</>
                    ) : `${weekMins}m`}
                  </p>
                  <p className="fs-stat-label">This week</p>
                </div>
                <div className="fs-stat-card">
                  <p className="fs-stat-value">{streak}</p>
                  <p className="fs-stat-label">Streak</p>
                </div>
              </div>

              {activeTaskInfo && (
                <>
                  <h3 className="fs-section-heading">ACTIVE TASK</h3>
                  <div className="fs-active-task">
                    <span className="fs-active-dot" />
                    <div>
                      <p className="fs-active-name">{activeTaskInfo.task.title}</p>
                      <p className="fs-active-sub">
                        In progress
                        {activeTaskInfo.todayMins > 0 && ` · ${activeTaskInfo.todayMins}m logged today`}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {recentActivity.length > 0 && (
                <>
                  <h3 className="fs-section-heading">RECENT ACTIVITY</h3>
                  <ul className="fs-activity-list">
                    {recentActivity.map((ev, i) => (
                      <li key={i} className="fs-activity-item">
                        <span className="fs-activity-dot" />
                        {ev.text}{ev.time ? ` ${timeAgo(ev.time)}` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {!activeTaskInfo && recentActivity.length === 0 && (
                <p className="fs-empty-text">No activity to show yet.</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="fs-page">
      <h1 className="fs-title">Find Friends</h1>
      <p className="fs-subtitle">Connect with others to share your productivity journey</p>

      {actionMessage && <div className="fs-action-message">{actionMessage}</div>}

      <div className="fs-tabs">
        <button
          className={`fs-tab${activeTab === "discover" ? " fs-tab--active" : ""}`}
          onClick={() => setActiveTab("discover")}
        >
          Discover
        </button>
        <button
          className={`fs-tab${activeTab === "friends" ? " fs-tab--active" : ""}`}
          onClick={() => setActiveTab("friends")}
        >
          My Friends
          {friends.length > 0 && <span className="fs-badge">{friends.length}</span>}
        </button>
        <button
          className={`fs-tab${activeTab === "pending" ? " fs-tab--active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Requests
          {pendingRequests.length > 0 && (
            <span className="fs-badge">{pendingRequests.length}</span>
          )}
        </button>
      </div>

      {activeTab === "discover" && (
        <div className="fs-tab-content">
          <div className="fs-search-wrap">
            <svg
              className="fs-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="fs-search-input"
              type="text"
              placeholder="Search for friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredUsers.length === 0 ? (
            <p className="fs-empty-text">No users found.</p>
          ) : (
            <ul className="fs-list">
              {filteredUsers.map((user) => (
                <li key={user.id} className="fs-list-item">
                  <div className="fs-avatar">{toInitials(displayName(user))}</div>
                  <div className="fs-item-body">
                    <p className="fs-item-name">{displayName(user)}</p>
                    <p className="fs-item-handle">{toHandle(user)}</p>
                    {user.created_at && (
                      <p className="fs-item-meta">{toJoinDate(user.created_at)}</p>
                    )}
                  </div>
                  {sentRequests.has(user.id) ? (
                    <button className="fs-btn fs-btn--sent" disabled>Requested</button>
                  ) : (
                    <button className="fs-btn fs-btn--add" onClick={() => handleSendRequest(user)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                      Add Friend
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "friends" && (
        <div className="fs-tab-content">
          {friends.length === 0 ? (
            <p className="fs-empty-text">No friends yet. Discover people to add!</p>
          ) : (
            <ul className="fs-list">
              {friends.map((friend) => (
                <li
                  key={friend.friendshipId}
                  className="fs-list-item fs-list-item--clickable"
                  onClick={() => openFriendProfile(friend)}
                >
                  <div className="fs-avatar">{toInitials(friend.name)}</div>
                  <div className="fs-item-body">
                    <p className="fs-item-name">{friend.name}</p>
                    <p className="fs-item-handle">{toHandle(friend)}</p>
                    {friend.created_at && (
                      <p className="fs-item-meta">{toJoinDate(friend.created_at)}</p>
                    )}
                  </div>
                  <div className="fs-item-actions">
                    <button
                      type="button"
                      className="fs-btn fs-btn--remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFriend(friend);
                      }}
                    >
                      Remove
                    </button>
                    <span className="fs-chevron">›</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "pending" && (
        <div className="fs-tab-content">
          {pendingRequests.length === 0 ? (
            <p className="fs-empty-text">No pending requests.</p>
          ) : (
            <ul className="fs-list">
              {pendingRequests.map((req) => (
                <li key={req.friendshipId} className="fs-list-item">
                  <div className="fs-avatar">{toInitials(req.name)}</div>
                  <div className="fs-item-body">
                    <p className="fs-item-name">{req.name}</p>
                    <p className="fs-item-handle">{toHandle(req)}</p>
                    {req.created_at && (
                      <p className="fs-item-meta">{toJoinDate(req.created_at)}</p>
                    )}
                    <p className="fs-item-sub">Wants to be your friend</p>
                  </div>
                  <div className="fs-request-actions">
                    <button className="fs-btn fs-btn--accept" onClick={() => handleAccept(req)}>Accept</button>
                    <button className="fs-btn fs-btn--decline" onClick={() => handleDecline(req)}>Decline</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
