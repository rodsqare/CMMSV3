# Checklist de Deployment en Railway

Usa esta checklist para asegurar que todo está configurado correctamente antes de desplegar.

## Antes del Deployment

### Repositorio Git
- [ ] Todo el código está commiteado
- [ ] No hay cambios sin guardar (`git status` está limpio)
- [ ] El repositorio está en GitHub/GitLab
- [ ] Railway tiene acceso al repositorio

### Configuración Local
- [ ] `.env.local` existe con `MYSQL_URL` (o se creará automáticamente)
- [ ] `npm install` se ejecutó sin errores
- [ ] `npm run build` ejecuta sin errores
- [ ] Base de datos local funciona (opcional, para testing)

### Código
- [ ] No hay errores de TypeScript (`npx tsc --noEmit`)
- [ ] No hay console.log de debugging
- [ ] No hay secretos hardcodeados en el código
- [ ] Los validadores de mantenimiento están funcionando

## En Railway Dashboard

### Configuración del Proyecto
- [ ] Proyecto creado en Railway
- [ ] Repositorio GitHub conectado
- [ ] Branch configurada (generalmente `main`)

### Base de Datos
- [ ] MySQL agregado al proyecto
- [ ] MySQL tiene estado "Running" (ícono verde)
- [ ] Nota las credenciales de conexión

### Servicio Next.js
- [ ] Agregado al proyecto
- [ ] Build command configurado: `npm ci && npx prisma generate && npm run build`
- [ ] Start command configurado: `sh scripts/railway-start.sh`

### Variables de Entorno (en Railway Dashboard)

**Críticas (sin estas no funciona):**
- [ ] `MYSQL_URL` = `mysql://root:tEeycLoXGnjLOUdnYVbDIazcjTNNvDeh@mysql.railway.internal:3306/railway`
- [ ] `DATABASE_URL` = `mysql://root:tEeycLoXGnjLOUdnYVbDIazcjTNNvDeh@mysql.railway.internal:3306/railway`
- [ ] `NODE_ENV` = `production`

**Seguridad (genera nuevas con `node scripts/generate-secrets.js`):**
- [ ] `JWT_SECRET` = 32+ caracteres aleatorios (NO usar el mismo en dev y prod)
- [ ] `NEXTAUTH_SECRET` = 32+ caracteres aleatorios (diferente del JWT_SECRET)

**Opcionales:**
- [ ] `RUN_SEED` = `false` (o `true` si quieres forzar seed)

## Durante el Deployment

### Monitoreo del Build
- [ ] Ver logs en Railway: `Deployments → View Logs`
- [ ] Build finaliza sin errores
- [ ] Prisma client se genera correctamente
- [ ] Migraciones se ejecutan sin error
- [ ] Seed se ejecuta correctamente (si la BD estaba vacía)

### Verificación Post-Deployment
- [ ] Endpoint `/api/health` retorna status 200
- [ ] Status es "healthy"
- [ ] Database está "connected"

```bash
# Prueba la salud de la aplicación
curl https://tu-app.railway.app/api/health
# Resultado esperado: {"status":"healthy","timestamp":"...","database":"connected"}
```

## Después del Deployment

### Acceso Inicial
- [ ] Puedes acceder a `https://tu-app.railway.app`
- [ ] Página carga sin errores 404
- [ ] Puedes cargar usuarios desde el dashboard

### Base de Datos
- [ ] Todas las tablas existen
- [ ] Datos de seed están presentes (usuarios de prueba)
- [ ] Puedes hacer queries sin errores

### Seguridad
- [ ] [ ] Usuarios de prueba con contraseñas débiles existen
- [ ] Las contraseñas de prueba han sido CAMBIADAS en producción
- [ ] HTTPS está habilitado (Railway lo hace automáticamente)
- [ ] Los secretos no están en el repositorio

### Validadores de Equipos y Mantenimiento
- [ ] Validaciones de código institucional (12 dígitos) funcionan
- [ ] Validaciones de número de serie único funcionan
- [ ] Estado de equipo es obligatorio
- [ ] Nivel de riesgo es obligatorio
- [ ] Validaciones de fechas de mantenimiento funcionan
- [ ] Sugerenor de fechas de mantenimiento funciona

### Monitoreo Continuo
- [ ] Logs se pueden ver en Railway
- [ ] Métricas de CPU/Memoria están normales
- [ ] No hay errores 500 frecuentes

## Si Algo Falla

### Build falla
1. Ver logs completos: `railway logs --follow`
2. Verificar que `railway.json` esté en la raíz
3. Verificar que `scripts/railway-start.sh` sea ejecutable
4. Verificar variables de entorno

### No puedo conectar a MySQL
1. Verificar que `MYSQL_URL` y `DATABASE_URL` sean idénticas
2. Verificar que MySQL esté "Running" en el dashboard
3. Esperar 60 segundos después de crear MySQL
4. Revisar logs de la app: `railway logs`

### Base de datos vacía
1. Ejecutar manualmente: `railway run npm run db:seed`
2. O setear `RUN_SEED=true` y redeploy

### Migraciones fallan
1. Conectarse a MySQL directamente
2. Verificar que el schema esté correcto
3. Ejecutar manualmente: `railway run npx prisma db push --accept-data-loss`

## Rollback

Si algo va mal y necesitas volver atrás:

```bash
# Desplegar un commit anterior
railway redeploy --id=<deployment-id>

# O simplemente hacer push a una rama anterior
git checkout <commit-hash>
git push
```

## Próximos Pasos

1. [ ] Monitorear la aplicación en producción por 24 horas
2. [ ] Configurar backups automáticos de MySQL
3. [ ] Configurar alertas de errores (Sentry, etc.)
4. [ ] Documentar credenciales en lugar seguro (no GitHub)
5. [ ] Crear usuario administrativo real en lugar del de prueba

---

**Última actualización**: Enero 2025
**Versión de Railway**: API v1
**Versión de MySQL**: 8.0
**Versión de Node**: 20+ (auto-detectado por Nixpacks)
