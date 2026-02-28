# Railway Quick Start - CMMS Biomédico

Despliegue rápido de tu aplicación CMMS en Railway con MySQL.

**Nota:** El proyecto ha sido configurado para funcionar correctamente con Railway. Se han añadido los targets de Prisma necesarios (`linux-musl-openssl-3.0.x`) para evitar errores de motor de consulta durante el deployment.

## 1️⃣ Preparativos (1 minuto)

```bash
# Asegúrate que todo esté commiteado
git add .
git commit -m "Listo para Railway"
git push

# Verifica que puedas conectar a MySQL localmente (opcional)
node scripts/verify-mysql-connection.js
```

## 2️⃣ Crear Proyecto en Railway (2 minutos)

1. Ir a https://railway.app
2. Login con GitHub
3. Crear nuevo proyecto
4. Conectar tu repositorio
5. Aguantar a que Railway lo detecte

## 3️⃣ Agregar Base de Datos MySQL (1 minuto)

En tu proyecto de Railway:
1. Click en "+ Add"
2. Seleccionar "Database" → "MySQL"
3. Esperar a que se cree (ícono verde)

## 4️⃣ Configurar Variables (2 minutos)

En el dashboard de Railway, agregar estas variables al servicio Next.js:

```
MYSQL_URL=mysql://root:tEeycLoXGnjLOUdnYVbDIazcjTNNvDeh@mysql.railway.internal:3306/railway
DATABASE_URL=mysql://root:tEeycLoXGnjLOUdnYVbDIazcjTNNvDeh@mysql.railway.internal:3306/railway
NODE_ENV=production
```

### Generar Secretos Seguros:

```bash
# En tu máquina local
node scripts/generate-secrets.js
```

Luego agregar a Railway:
```
JWT_SECRET=<el valor generado>
NEXTAUTH_SECRET=<otro valor generado>
```

## 5️⃣ Deploy (2 minutos)

Railway detectará automáticamente `railway.json` y:
- Instalará dependencias
- Compilará Next.js
- Creará todas las tablas en MySQL
- Sembrará datos de prueba
- Iniciará la aplicación

El deploy termina cuando ves el ícono verde.

## 6️⃣ Verificar que Funciona (1 minuto)

```bash
# En tu navegador o terminal
curl https://tu-app.railway.app/api/health

# Respuesta esperada:
# {"status":"healthy","timestamp":"...","database":"connected"}
```

## 7️⃣ Login Inicial

**Email**: admin@hospital.com  
**Password**: admin123

⚠️ **CAMBIA ESTA CONTRASEÑA INMEDIATAMENTE** en producción

## 📊 Dashboard

Después del deploy, tu URL será similar a:
```
https://cmmsv3-production.up.railway.app
```

(Railroad asigna un dominio automático, también puedes agregar tu propio dominio)

## 🆘 Troubleshooting

### ¿No veo errores pero no me conecta?
```bash
# Ver logs en tiempo real
railway logs --follow
```

### ¿La BD no se crea?
1. Verifica que MySQL esté "Running" (ícono verde)
2. Verifica logs: `railway logs`
3. Espera 60 segundos, a veces tarda
4. Si persiste: `railway run npx prisma db push --accept-data-loss`

### ¿No puedo conectarme con mi cliente MySQL?
1. Usa Railway CLI para tunelizar:
   ```bash
   railway connect mysql
   # Luego conecta a localhost:3306 en tu cliente
   ```

### ¿Quiero hacer un deploy nuevo sin perder datos?
```bash
# Cambiar variables y redeploy automáticamente
# Los datos de MySQL persisten
```

## 📚 Documentación Completa

- **Guía detallada**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Validaciones**: [VALIDATIONS_REFERENCE.md](./VALIDATIONS_REFERENCE.md)

## 🔐 Seguridad

- [ ] JWT_SECRET y NEXTAUTH_SECRET son únicos (genera con `generate-secrets.js`)
- [ ] No están en el repositorio
- [ ] Están en Railway Dashboard Variables
- [ ] Diferentes en dev y producción
- [ ] Contraseña de prueba cambiada

## 📈 Próximos Pasos

1. Monitorear en producción por 24 horas
2. Configurar alertas de error
3. Crear usuarios reales
4. Hacer backup de la BD
5. Documentar el proceso

## 💾 URLs Útiles

- **Dashboard**: https://railway.app/dashboard
- **Dominio de la app**: Se muestra en Railway
- **Logs**: Railway Dashboard → Deployments → Logs
- **Métricas**: Railway Dashboard → Metrics

## ⏱️ Tiempo Total: ~10 minutos

---

## 🔧 Solución de Problemas Comunes

### Error: "Prisma Client could not locate the Query Engine"
**Solución:** ✅ Ya está configurado en el proyecto
- Se han añadido los targets correctos en `prisma/schema.prisma`
- El script de Railway regenera Prisma automáticamente
- No requiere acción adicional

### Error: "MYSQL_URL no está configurada"
**Solución:**
1. Ir a Railway Dashboard
2. Click en tu proyecto
3. Click en "Variables" 
4. Asegúrate que `MYSQL_URL` y `DATABASE_URL` estén configuradas

### Migraciones fallando
**Solución:**
- Railway ejecuta automáticamente `npx prisma db push`
- Si falla, revisa los logs: Dashboard → Deployments → Logs
- Verifica que la BD MySQL esté disponible (estado verde en Railway)

### Base de datos vacía después del deploy
**Solución:**
- El seed se ejecuta automáticamente si no hay datos
- Para forzar seed: agrega `RUN_SEED=true` en Variables
- Redeploy después: Dashboard → Deployments → Redeploy

---

¿Preguntas? Revisa [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) para la guía completa.
