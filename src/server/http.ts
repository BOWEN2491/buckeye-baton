import type { Sql } from './db';
import { z } from 'zod';
import * as v from './validation';
import type { User } from '../shared/types';
// Shared request helpers for API handlers.
export class ApiFailure extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export const fail = (status: number, code: string, message: string): never => { throw new ApiFailure(status,code,message); };
export const json = (data: unknown, status = 200) => Response.json({data}, {status});
export async function rows(sql: Sql, query: string, params: unknown[] = []) { return (await sql.query(query, params)).rows as Record<string, any>[]; }
export async function one(sql: Sql, table: string, id: string) { const row = (await rows(sql, `SELECT * FROM ${table} WHERE id=$1`,[id]))[0]; return row ?? fail(404,'NOT_FOUND','Record not found'); }
export async function actor(req: Request, sql: Sql): Promise<User> { const id = req.headers.get('x-demo-user-id'); if (!id) fail(401,'UNAUTHENTICATED','Choose a demo identity'); const user = (await rows(sql,'SELECT * FROM users WHERE id=$1',[id]))[0]; return user as User ?? fail(401,'UNAUTHENTICATED','Unknown demo identity'); }
export function role(user: User, expected: string) { if (user.role !== expected) fail(403,'FORBIDDEN',`This action requires ${expected} role`); }
export async function ownProject(sql: Sql, id: string, user: User) { const p = await one(sql,'projects',id); role(user,'student'); if(p.ownerId !== user.id) fail(403,'FORBIDDEN','Only the project owner can edit this project'); return p; }
export async function parse(req: Request, schema: z.ZodType) { let body; try {body = await req.json();} catch {fail(400,'INVALID_INPUT','Malformed JSON body');} const parsed=schema.safeParse(body); if(!parsed.success) fail(400,'INVALID_INPUT',parsed.error.issues[0]?.message ?? 'Invalid input'); return parsed.data as Record<string, any>; }
export const parameter = (value: unknown) => value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
export function validateProject(data: Record<string, unknown>) { const parsed = v.completeProject.safeParse(data); if (!parsed.success) return fail(400,'INVALID_INPUT',parsed.error.issues[0]?.message ?? 'Invalid project'); return parsed.data; }
export async function insert(sql: Sql, table: string, data: Record<string, any>, conflict = '') { const entries=Object.entries(data); const keys=entries.map(([key])=>`"${key}"`).join(','); const args=entries.map(([,value]) => parameter(value)); return (await rows(sql,`INSERT INTO ${table} (${keys}) VALUES (${args.map((_,i)=>`$${i+1}`).join(',')}) ${conflict} RETURNING *`,args))[0]; }
export async function update(sql: Sql, table: string, id: string, data: Record<string,any>) { const entries=Object.entries(data); if(!entries.length) fail(400,'INVALID_INPUT','Provide at least one field'); return (await rows(sql,`UPDATE ${table} SET ${entries.map(([k],i)=>`"${k}"=$${i+1}`).join(',')}, "updatedAt"=now() WHERE id=$${entries.length+1} RETURNING *`,[...entries.map(([,val])=>parameter(val)),id]))[0]; }
