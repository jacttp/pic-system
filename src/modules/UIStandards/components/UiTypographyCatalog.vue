<script setup lang="ts">
interface FontInventoryItem {
  name: string;
  role: string;
  contract: string;
  className: string;
  status: 'required' | 'restricted' | 'not-approved';
}

interface TypeRole {
  id: string;
  name: string;
  classes: string;
  sample: string;
  guidance: string;
}

const fontInventory: FontInventoryItem[] = [
  {
    name: 'Inter',
    role: 'Interfaz del producto',
    contract: 'Familia obligatoria para navegación, títulos, controles, tablas y texto operativo.',
    className: 'font-sans',
    status: 'required',
  },
  {
    name: 'JetBrains Mono',
    role: 'Datos técnicos',
    contract: 'Uso restringido a IDs, códigos, fechas técnicas y cifras que necesitan alineación tabular.',
    className: 'font-mono',
    status: 'restricted',
  },
  {
    name: 'Manrope / DM Sans',
    role: 'Alternativas históricas',
    contract: 'No están autorizadas. Una migración tipográfica debe evaluarse y aprobarse para todo el producto.',
    className: '—',
    status: 'not-approved',
  },
];

const typeRoles: TypeRole[] = [
  {
    id: 'page-title',
    name: 'Título de página',
    classes: 'text-xl sm:text-2xl font-black tracking-tight',
    sample: 'Reporte semanal de ventas',
    guidance: 'Un solo h1 por vista. Debe nombrar la tarea, no repetir el módulo o la navegación.',
  },
  {
    id: 'section-title',
    name: 'Título de sección',
    classes: 'text-lg font-extrabold tracking-tight',
    sample: 'Resultados comparativos',
    guidance: 'Separa bloques principales y conserva una jerarquía claramente inferior al título de página.',
  },
  {
    id: 'component-title',
    name: 'Título de componente',
    classes: 'text-sm font-bold',
    sample: 'Evolución por semana',
    guidance: 'Nombra tablas, gráficas, grupos de filtros y paneles operativos.',
  },
  {
    id: 'body',
    name: 'Texto operativo',
    classes: 'text-sm font-medium leading-6',
    sample: 'Consulta el resultado vigente y aplica cambios únicamente cuando los filtros estén listos.',
    guidance: 'Para explicaciones y contenido continuo. No usar mayúsculas sostenidas.',
  },
  {
    id: 'support',
    name: 'Texto de apoyo',
    classes: 'text-xs font-medium leading-5',
    sample: 'Última actualización: hoy, 09:42',
    guidance: 'Metadatos y aclaraciones breves. No debe contener información indispensable para completar una tarea.',
  },
  {
    id: 'label',
    name: 'Etiqueta compacta',
    classes: 'text-[10px] font-bold uppercase tracking-[0.14em]',
    sample: 'PERIODO APLICADO',
    guidance: 'Eyebrows, categorías y labels cortos. Evitar frases, párrafos y abuso de tracking.',
  },
];

const weightRules = [
  ['400 · normal', 'Texto largo excepcional y contenido secundario sin énfasis.'],
  ['500 · medium', 'Cuerpo y descripciones operativas.'],
  ['600 · semibold', 'Metadatos relevantes y controles secundarios.'],
  ['700 · bold', 'Botones, encabezados de tabla y títulos de componente.'],
  ['800 · extrabold', 'Títulos de sección y valores destacados.'],
  ['900 · black', 'Título principal o énfasis corto; nunca párrafos completos.'],
];

const hardRules = [
  'No importar fuentes dentro de un módulo ni declarar font-family local.',
  'No elegir una familia distinta para “dar personalidad” a una pantalla.',
  'Usar font-sans por defecto; la herencia del body ya aplica Inter.',
  'Reservar font-mono para datos técnicos y combinarlo con tabular-nums cuando se comparen cifras.',
  'No usar font-mono en títulos, botones, navegación, descripciones o etiquetas de negocio.',
  'No reducir texto importante para hacerlo caber: cambia el layout, permite wrap o prioriza contenido.',
  'La personalidad visual proviene de jerarquía, ritmo, composición y tokens; no de mezclar familias.',
];

const statusMeta = {
  required: {
    label: 'Obligatoria',
    className: 'border-pic-brand-border bg-pic-brand-soft text-pic-brand',
  },
  restricted: {
    label: 'Uso restringido',
    className: 'border-[hsl(var(--pic-info)/0.28)] bg-[hsl(var(--pic-info)/0.08)] text-pic-info',
  },
  'not-approved': {
    label: 'No autorizada',
    className: 'border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger',
  },
};
</script>

<template>
  <div class="space-y-5 font-sans">
    <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-nav text-pic-nav-text shadow-sm">
      <div class="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-end">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-nav-text-muted">Contrato tipográfico</p>
          <h2 class="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Una sola voz para todo el producto.</h2>
          <p class="mt-3 max-w-3xl text-sm font-medium leading-6 text-pic-nav-text-muted">
            La familia no se decide por módulo. Inter resuelve la interfaz operativa y JetBrains Mono identifica
            únicamente información técnica o numérica que necesita alineación.
          </p>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-nav-text-muted">Implementación</p>
          <div class="mt-3 space-y-2 font-mono text-xs">
            <p><span class="text-pic-nav-text-muted">UI</span> <span class="ml-2 font-bold text-pic-nav-text">font-sans</span></p>
            <p><span class="text-pic-nav-text-muted">Datos</span> <span class="ml-2 font-bold text-pic-nav-text">font-mono tabular-nums</span></p>
          </div>
        </div>
      </div>
      <div class="h-1 bg-pic-brand"></div>
    </section>

    <section class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
      <div class="border-b border-pic-border pb-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Inventario vigente</p>
        <h2 class="mt-1 text-lg font-extrabold tracking-tight text-pic-text-main">Familias y alcance</h2>
        <p class="mt-1 max-w-3xl text-xs font-medium leading-5 text-pic-text-muted">
          La existencia de una fuente en el historial o en una dependencia no autoriza su uso dentro de una vista.
        </p>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <article v-for="font in fontInventory" :key="font.name" class="rounded-xl border border-pic-border bg-pic-muted-surface p-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="text-base font-extrabold text-pic-text-main">{{ font.name }}</h3>
              <p class="mt-0.5 text-xs font-semibold text-pic-text-muted">{{ font.role }}</p>
            </div>
            <span class="rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]" :class="statusMeta[font.status].className">
              {{ statusMeta[font.status].label }}
            </span>
          </div>
          <p class="mt-4 text-xs font-medium leading-5 text-pic-text-muted">{{ font.contract }}</p>
          <p class="mt-3 rounded-lg border border-pic-border bg-pic-surface px-3 py-2 font-mono text-[10px] font-bold text-pic-text-main">
            {{ font.className }}
          </p>
        </article>
      </div>
    </section>

    <section class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
      <div class="border-b border-pic-border pb-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Escala de interfaz</p>
        <h2 class="mt-1 text-lg font-extrabold tracking-tight text-pic-text-main">Jerarquía reutilizable</h2>
        <p class="mt-1 max-w-3xl text-xs font-medium leading-5 text-pic-text-muted">
          Usa roles tipográficos antes que combinaciones improvisadas de tamaño, peso y tracking.
        </p>
      </div>

      <div class="mt-4 divide-y divide-pic-border rounded-xl border border-pic-border">
        <article v-for="role in typeRoles" :key="role.id" class="grid gap-3 p-4 lg:grid-cols-[12rem_minmax(15rem,0.8fr)_minmax(18rem,1fr)] lg:items-center">
          <div>
            <h3 class="text-xs font-bold text-pic-text-main">{{ role.name }}</h3>
            <p class="mt-1 break-words font-mono text-[10px] leading-4 text-pic-brand">{{ role.classes }}</p>
          </div>
          <p :class="role.classes" class="min-w-0 text-pic-text-main">{{ role.sample }}</p>
          <p class="text-xs font-medium leading-5 text-pic-text-muted">{{ role.guidance }}</p>
        </article>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Pesos admitidos</p>
        <h2 class="mt-1 text-lg font-extrabold tracking-tight text-pic-text-main">Énfasis con propósito</h2>
        <div class="mt-4 space-y-2">
          <div v-for="rule in weightRules" :key="rule[0]" class="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-pic-border bg-pic-muted-surface p-3">
            <p class="text-xs font-bold text-pic-text-main">{{ rule[0] }}</p>
            <p class="text-xs font-medium leading-5 text-pic-text-muted">{{ rule[1] }}</p>
          </div>
        </div>
      </article>

      <article class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Reglas obligatorias</p>
        <h2 class="mt-1 text-lg font-extrabold tracking-tight text-pic-text-main">Lo que un módulo no decide</h2>
        <ul class="mt-4 space-y-2">
          <li v-for="rule in hardRules" :key="rule" class="flex items-start gap-2.5 rounded-lg border border-pic-border bg-pic-muted-surface p-3">
            <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-pic-brand text-[8px] text-white">
              <i class="fa-solid fa-check"></i>
            </span>
            <p class="text-xs font-medium leading-5 text-pic-text-muted">{{ rule }}</p>
          </li>
        </ul>
      </article>
    </section>
  </div>
</template>
