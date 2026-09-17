export default function ParticipantList({ participants, mySocketId, myRole, onAssignRole, onRemove }) {
  return (
    <div className="participants">
      <h3>Participants ({participants.length})</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.socketId} className={p.socketId === mySocketId ? "me" : ""}>
            <div className="p-top">
              <span className="pname">{p.username}{p.socketId === mySocketId ? " (you)" : ""}</span>
              <span className={`badge ${p.role}`}>{p.role}</span>
            </div>

            {myRole === "host" && p.socketId !== mySocketId && (
              <div className="actions">
                {p.role === "participant" && (
                  <button
                    className="mod-btn promote"
                    title="Make Moderator"
                    onClick={() => onAssignRole(p.socketId, "moderator")}
                  >
                    ⬆ Make Mod
                  </button>
                )}
                {p.role === "moderator" && (
                  <button
                    className="mod-btn demote"
                    title="Remove Moderator"
                    onClick={() => onAssignRole(p.socketId, "participant")}
                  >
                    ⬇ Remove Mod
                  </button>
                )}
                <button
                  className="mod-btn kick"
                  title="Remove from room"
                  onClick={() => onRemove(p.socketId)}
                >
                  ✕ Kick
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
