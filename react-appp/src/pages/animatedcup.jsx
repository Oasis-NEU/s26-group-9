import "./animatedcup.css";

export default function AnimatedCup() {
    return (
        <div className="scene">
            {/* steam clouds — rendered before cup so they sit behind */}
            <div className="clouds">
                <div className="cloud c1" />
                <div className="cloud c2" />
                <div className="cloud c3" />
                <div className="cloud c4" />
                <div className="cloud c5" />
                <div className="cloud c6" />
                <div className="cloud c7" />
            </div>
            <div className="shadow" />
            <div className="cup-floater">
                <img src="/logo.svg" alt="ProductiviTea" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
        </div>
    );
}