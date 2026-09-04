"use client";

import { Empty, Tag, Typography } from "antd";
import Link from "next/link";
import type { GameSession, Room } from "@/lib/game-sessions/game-session-api";
import styles from "./sessions.module.css";

const START_HOUR = 9;
const END_HOUR = 24;
const HOUR_HEIGHT = 72;

function minutesFromDayStart(value: string) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function timeLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatRange(session: GameSession) {
  const start = new Date(session.startTime);
  const end = new Date(start.getTime() + session.durationMinutes * 60_000);
  return `${start.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}-${end.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

function statusColor(status: GameSession["status"]) {
  return {
    recruiting: "processing",
    full: "warning",
    cancelled: "default",
    completed: "success",
  }[status] || "default";
}

export function SessionScheduleBoard({ rooms, sessions }: { rooms: Room[]; sessions: GameSession[] }) {
  const activeRooms = rooms.filter((room) => room.status === "active");
  const roomColumns = activeRooms.length ? activeRooms : [{ id: "unassigned", name: "未分配房间", capacity: 0, status: "active", storeId: "", location: null, notes: null, createdAt: "", updatedAt: "" }];
  const unassignedSessions = sessions.filter((session) => !session.roomId);

  if (!sessions.length) {
    return <Empty description="当天暂无排期，创建场次后会在这里按房间展示占用情况" />;
  }

  return (
    <div className={styles.scheduleWrap}>
      <div
        className={styles.scheduleGrid}
        style={{
          gridTemplateColumns: `88px repeat(${roomColumns.length}, minmax(220px, 1fr))`,
          minWidth: 88 + roomColumns.length * 220,
        }}
      >
        <div className={styles.scheduleCorner}>时间 / 房间</div>
        {roomColumns.map((room) => (
          <div key={room.id} className={styles.scheduleRoomHeader}>
            <Typography.Text strong>{room.name}</Typography.Text>
            <Typography.Text type="secondary">{room.capacity ? `${room.capacity} 人` : "待分配"}</Typography.Text>
          </div>
        ))}

        <div className={styles.scheduleTimes}>
          {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, index) => (
            <div key={index} className={styles.scheduleTime} style={{ height: HOUR_HEIGHT }}>
              {timeLabel(START_HOUR + index)}
            </div>
          ))}
        </div>

        {roomColumns.map((room) => {
          const roomSessions = room.id === "unassigned" ? unassignedSessions : sessions.filter((session) => session.roomId === room.id);
          return (
            <div key={room.id} className={styles.scheduleRoomColumn} style={{ height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT }}>
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, index) => (
                <div key={index} className={styles.scheduleHourLine} style={{ top: index * HOUR_HEIGHT }} />
              ))}
              {roomSessions.map((session) => {
                const top = Math.max(0, ((minutesFromDayStart(session.startTime) - START_HOUR * 60) / 60) * HOUR_HEIGHT);
                const height = Math.max(46, (session.durationMinutes / 60) * HOUR_HEIGHT - 8);
                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className={styles.scheduleBlock}
                    style={{ top, height }}
                  >
                    <span>{formatRange(session)}</span>
                    <strong>{session.title || session.scriptName}</strong>
                    <em>{session.joinedSeats}/{session.capacity} 人 · {session.dmName || "未分配 DM"}</em>
                    <Tag color={statusColor(session.status)}>{session.status}</Tag>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
