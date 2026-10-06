import React, { useState } from "react";
import { Field, Button, Notice, Loading, Badge, useResource } from "./ui";
import { request } from "../services/api";
export function TeamEditor({ value, busy, onSave, onClose }) {
  const [status, setStatus] = useState(value.status),
    [leader, setLeader] = useState(value.leaderId),
    [ids, setIds] = useState(value.memberIds),
    [regen, setRegen] = useState(false),
    [query, setQuery] = useState(""),
    [added, setAdded] = useState([]);
  const team = useResource(
    () => request("/admin/teams/" + value._id),
    [value._id],
  );
  const students = useResource(
    () => request("/admin/students?search=" + encodeURIComponent(query)),
    [query],
  );
  const members = [...(team.data?.members || []), ...added].filter((m) =>
    ids.includes(m._id),
  );
  return (
    <div>
      <div className="table-toolbar">
        <h2>Edit team</h2>
        <Button className="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
      <Notice error>{team.error || students.error}</Notice>
      {team.loading ? (
        <Loading />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              status,
              leaderId: leader,
              memberIds: ids,
              regenerateCode: regen,
            });
          }}
        >
          <p>
            <strong>{value.name}</strong> · Registered team name is fixed.
          </p>
          <label className="field">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>ACTIVE</option>
              <option>INACTIVE</option>
            </select>
          </label>
          <label className="field">
            Team leader
            <select value={leader} onChange={(e) => setLeader(e.target.value)}>
              {members.map((m) => (
                <option value={m._id} key={m._id}>
                  {m.name} · {m.rollNo}
                </option>
              ))}
            </select>
          </label>
          <h3>Members</h3>
          {members.map((m) => (
            <div className="member-edit" key={m._id}>
              <span>
                <strong>{m.name}</strong>
                <small>{m.rollNo}</small>
              </span>
              <Badge>{m._id === leader ? "TEAM_LEADER" : "STUDENT"}</Badge>
              <Button
                type="button"
                className="secondary small"
                disabled={m._id === leader}
                onClick={() => setIds((old) => old.filter((x) => x !== m._id))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Field
            label="Find a student to add"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or roll number"
          />
          {query &&
            students.data?.rows
              .filter(
                (s) =>
                  !s.teamId && !ids.includes(s._id) && s.status === "ACTIVE",
              )
              .map((s) => (
                <div className="member-edit" key={s._id}>
                  <span>
                    {s.name}
                    <small>{s.rollNo}</small>
                  </span>
                  <Button
                    type="button"
                    className="secondary small"
                    onClick={() => {
                      setIds((old) => [...old, s._id]);
                      setAdded((old) => [...old, s]);
                      setQuery("");
                    }}
                  >
                    Add member
                  </Button>
                </div>
              ))}
          <label className="check">
            <input
              type="checkbox"
              checked={regen}
              onChange={(e) => setRegen(e.target.checked)}
            />{" "}
            Regenerate team invitation code
          </label>
          <Button busy={busy}>Save team changes</Button>
        </form>
      )}
    </div>
  );
}
