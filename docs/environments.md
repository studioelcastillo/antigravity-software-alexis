# Estrategia de Entornos y Despliegue — EL CASTILLO GROUP SAS

Este documento define la estructura de servidores y la política de desarrollo para asegurar la estabilidad del software.

## 1. Proyectos de Supabase

Se han designado dos proyectos independientes para separar los datos reales de las pruebas de desarrollo:

| Entorno        | Proyecto Supabase                         | ID de Proyecto         | Propósito                                                              |
| :------------- | :---------------------------------------- | :--------------------- | :--------------------------------------------------------------------- |
| **PRODUCCIÓN** | `gerencia1elcastillo@gmail.com's Project` | `ysorlqfwqccsgxxkpzdx` | Datos reales, usuarios finales y operaciones de negocio.               |
| **STAGING**    | `El Castillo Pruebas`                     | `pnnrsqocukixusmzrlhy` | Pruebas de nuevas funcionalidades, depuración y validación por Alexis. |

## 2. Política de Sincronización y Autorización

Para agilizar el desarrollo, se establecen las siguientes reglas de operación:

1. **Autorización Delegada**: El sistema tiene permiso para modificar y mover cualquier parte del proyecto de forma autónoma. Solo se requerirá autorización explícita para la **eliminación definitiva** de archivos o datos.
2. **Sincronización Total**: Cualquier cambio realizado localmente debe reflejarse en:
   - **GitHub**: Repositorio oficial (ramas `main` para producción y `staging` para pruebas).
   - **Carpeta del Proyecto**: Sincronización continua con el entorno local.
3. **Despliegue Automático**:
   - Los cambios en la rama `staging` activan el despliegue a `pruebas.livstre.com`.
   - Los cambios en la rama `main` activan el despliegue a producción.
4. **Persistencia de Datos**: Nunca se deben mezclar las credenciales de un entorno con otro. El archivo `.env.production` y `.env.staging` deben ser respetados estrictamente.

---

> [!IMPORTANT]
> Esta documentación debe ser consultada por cualquier desarrollador o IA antes de realizar modificaciones estructurales en el proyecto.
