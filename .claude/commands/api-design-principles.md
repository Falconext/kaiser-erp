Review or implement the following API design principles for this project (Falconext MyPE — NestJS backend):

## Response Format
All responses MUST use the global `ResponseInterceptor` wrapper:
- Success: `{ code: 1, message: string, data: any }`
- Error: `{ code: 0, message: string }`
Never return raw objects directly — the interceptor handles this automatically.

## Route Naming
- Use kebab-case for URL segments: `/api/guia-remision`, `/api/tipos-operacion`
- Use plural nouns for collections: `/api/productos`, `/api/clientes`
- Nest sub-resources: `/api/empresa/:id/sedes`
- Prefix all routes with `/api` (global prefix set in `main.ts`)

## Controller Structure
```ts
@Controller('resource')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourceController {
  @Get()          // list / search
  @Get(':id')     // single
  @Post()         // create
  @Patch(':id')   // partial update
  @Delete(':id')  // delete
}
```

## Auth & Guards
- Always apply `JwtAuthGuard` + `RolesGuard` on protected controllers
- Use `@Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')` decorator for role-based access
- Use `@RequiresModule('CODIGO')` for plan-level feature gating
- `ADMIN_SISTEMA` bypasses all guards — never add extra checks for this role
- Extract user from request: `@GetUser() user: UserPayload` (`{ sub, rol, empresaId, sedeId }`)

## DTOs & Validation
- All input via DTOs with `class-validator` decorators
- `ValidationPipe` is global with `whitelist: true, transform: true` — unknown fields are stripped automatically
- Use `@IsOptional()` + `@Transform()` for query params that need type coercion
- Never trust raw `req.body` — always go through DTOs

## Multi-Sede Scoping
- Every query that touches business data MUST scope by `empresaId` (and `sedeId` when relevant)
- Get them from the JWT payload: `user.empresaId`, `user.sedeId`
- Never allow a user to access another empresa's data

## Error Handling
- Throw NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `ForbiddenException`, `ConflictException`
- For SUNAT data errors that must NOT be retried, throw `SunatPayloadException`
- Let the global exception filter format the `{ code: 0, message }` response — don't manually format errors

## Prisma Queries
- Always use `prisma.$transaction([])` for operations that modify multiple tables
- Select only needed fields — avoid `findMany` with no `select` on large tables
- Use `include` sparingly; prefer explicit `select` for performance
- Add `orderBy` on all list queries that return to the UI

## Pagination Pattern
```ts
@Get()
findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
  const skip = (page - 1) * limit;
  return this.service.findAll({ skip, take: limit });
}
// Return: { data: T[], total: number, page: number, limit: number }
```

## File Uploads
- Use `@UseInterceptors(FileInterceptor(...))` + `@UploadedFile()` for single files
- Route all uploads through the `S3Service` — never save files locally on the server
- Validate MIME type and size in the DTO or interceptor before uploading

## Naming Conventions
- Services: `ResourceService` in `resource.service.ts`
- Controllers: `ResourceController` in `resource.controller.ts`
- DTOs: `CreateResourceDto`, `UpdateResourceDto` in `dto/`
- Entities/interfaces in `entities/` or inline if small
- Module: `ResourceModule` in `resource.module.ts`

## What to Check
When reviewing an endpoint or implementing a new one, verify:
1. Route follows REST conventions and kebab-case
2. JWT + Roles guards are applied
3. Input goes through a DTO with validation
4. Query is scoped by `empresaId`/`sedeId`
5. Response uses the interceptor format (no manual `{ code, data }` wrapping)
6. Errors throw NestJS exceptions, not raw `throw new Error()`
7. Multi-table writes use `$transaction`
8. No N+1 queries — use `include`/`select` appropriately
