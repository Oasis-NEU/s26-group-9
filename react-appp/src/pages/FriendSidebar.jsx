import { useState } from "react";

export default function FriendSidebar({
  friends,
  selectedFriendId,
  onSelectFriend,
  onAddFriend
}) {
  const [search, setSearch] = useState("");

  return (
    <div style={{ padding: "20px" }}>
      <h2>Find Friends</h2>

      <input
        type="text"
        placeholder="Search username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px",
          width: "250px",
          marginRight: "10px"
        }}
      />

      <button
        type="button"
        onClick={() => onAddFriend(search)}
        style={{
          padding: "10px",
          background: "#c48a5a",
          color: "white",
          border: "none",
          borderRadius: "6px"
        }}
      >
        Add Friend
      </button>

      <h3 style={{ marginTop: "30px" }}>Your Friends</h3>

      {friends.length === 0 ? (
        <p>No friends yet</p>
      ) : (
        friends.map((friend) => (
          <div
            key={friend.id}
            onClick={() => onSelectFriend(friend.id)}
            style={{
              padding: "12px",
              marginTop: "10px",
              borderRadius: "8px",
              cursor: "pointer",
              background:
                selectedFriendId === friend.id ? "#eee" : "#f7f7f7"
            }}
          >
            <strong>{friend.name}</strong>
            <p style={{ fontSize: "12px", color: "gray" }}>
              {friend.status || "No activity"}
            </p>
          </div>
        ))
      )}
    </div>
  );
}