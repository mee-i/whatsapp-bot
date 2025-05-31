import { mysqlTable, varchar, text, index, unique, int, boolean, timestamp, float } from 'drizzle-orm/mysql-core';

export const authTable = mysqlTable('auth', {
    session: varchar('session', { length: 50 }).notNull(),
    id: varchar('id', { length: 100 }).notNull(),
    value: text('value'),
}, (auth) => [
    unique('idxunique').on(auth.session, auth.id),
    index('idxsession').on(auth.session),
    index('idxid').on(auth.id),
]);

export const userTable = mysqlTable('user', {
    id: varchar('id', { length: 100 }).notNull().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    xp: int('xp').notNull().default(0),
    level: int('level').notNull().default(0),
    premium: boolean('premium').notNull().default(false),
});

export const messageNotificationTable = mysqlTable('message_notification', {
    id: varchar('id', { length: 100 }).notNull().primaryKey(),
    lat: float('lat').notNull(),
    lon: float('lon').notNull(),
});

export const earthquakeTable = mysqlTable('earthquake', {
    event_id: varchar('event_id', { length: 100 }).notNull().primaryKey(),
    status: varchar('status', { length: 20 }).notNull(),
    waktu: timestamp('waktu', { mode: 'string' }).notNull(),
    lintang: float('lintang').notNull(),
    bujur: float('bujur').notNull(),
    dalam: int('dalam').notNull(),
    mag: float('mag').notNull(),
    fokal: varchar('fokal', { length: 50 }).notNull(),
    area: varchar('area', { length: 100 }).notNull(),
});

export const commandLogTable = mysqlTable('command_log', {
    id: varchar('id', { length: 100 }).notNull().primaryKey(),
    command: varchar('command', { length: 100 }).notNull(),
    args: text('args').notNull(),
    timestamp: timestamp('timestamp', { mode: 'string' }).notNull().defaultNow(),
    isGroup: boolean('isGroup').notNull().default(false),
});