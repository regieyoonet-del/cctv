import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const cameras = pgTable("cameras", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  streamUrl: text("stream_url").notNull(),
  snapshotUrl: text("snapshot_url"),
  streamType: text("stream_type").notNull().default("hls"), // hls, mjpeg, snapshot, webrtc
  username: text("username"),
  password: text("password"),
  location: text("location"),
  isActive: boolean("is_active").notNull().default(true),
  refreshInterval: integer("refresh_interval").default(5000), // ms for snapshot refresh
  recordingEnabled: boolean("recording_enabled").notNull().default(false),
  recordingInterval: integer("recording_interval").notNull().default(60), // seconds between captures
  retentionDays: integer("retention_days").notNull().default(7), // days to keep recordings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  cameraId: integer("camera_id").notNull().references(() => cameras.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  contentType: text("content_type").notNull().default("image/jpeg"),
  triggerType: text("trigger_type").notNull().default("scheduled"), // scheduled, manual, motion
  fileSize: integer("file_size"),
  duration: integer("duration"), // seconds
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
