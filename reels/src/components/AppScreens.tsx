/**
 * Recreación de /sugerir-emprendimiento (app/sugerir-emprendimiento/SugerirEmprendimientoContent.tsx)
 * y de su estado "submitted", en px lógicos de celular.
 * Estilos de components/ui/{input,button,label}.tsx. Textos de UI iguales al repo.
 */
import React from 'react';
import {AlertCircle, ArrowLeft, Info} from 'lucide-react';
import {colors} from '../brand';
import {BottomNav} from './BottomNav';
import {STATUS_H} from './Phone';

// hsl de app/globals.css
const primary = colors.terracota; // --primary 14 70% 42%
const terracotta = '#D4633A'; // --terracotta (focus)
const olive = colors.olive; // --foreground
const muted = '#556D5B'; // --muted-foreground 135 12% 38%
const amber = '245,158,11'; // amber-500

// lib/venture-constants.ts
const VENTURE_CATEGORIES = [
  'Panificados',
  'Pastelería',
  'Viandas',
  'Congelados',
  'Premezclas',
  'Catering',
  'Productos artesanales',
  'Envíos a domicilio',
  'Ferias / retiro',
];
const VENTURE_MODALITIES = ['Delivery', 'Retiro', 'Envíos', 'Ferias'];

/** CheckCircle2 de lucide con el tilde que se dibuja. */
export const CheckCircle2: React.FC<{size: number; color: string; progress: number}> = ({size, color, progress}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
  </svg>
);

// —— Primitivas (components/ui) ——
const Label: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{fontSize: 14, fontWeight: 500, lineHeight: 1, color: olive}}>{children}</div>
);

const Input: React.FC<{value?: string; placeholder: string; focused?: boolean; caret?: boolean}> = ({
  value,
  placeholder,
  focused,
  caret,
}) => (
  <div
    style={{
      height: 48,
      borderRadius: 16,
      border: `1px solid ${focused ? terracotta : 'rgba(45,74,52,0.2)'}`,
      boxShadow: focused ? '0 0 0 2px rgba(212,99,58,0.3)' : 'none',
      background: colors.crema,
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      // Como un input real: al tipear, se ve el final del texto.
      justifyContent: focused && value ? 'flex-end' : 'flex-start',
      fontSize: 16,
      color: value ? olive : muted,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    }}
  >
    <span style={{flexShrink: 0}}>{value || placeholder}</span>
    {caret ? <span style={{width: 2, height: 20, background: terracotta, marginLeft: 1, flexShrink: 0}} /> : null}
  </div>
);

const Chip: React.FC<{label: string; selected?: boolean}> = ({label, selected}) => (
  <div
    style={{
      padding: '6px 12px',
      borderRadius: 999,
      fontSize: 14,
      lineHeight: '20px',
      border: `1px solid ${selected ? primary : 'rgba(45,74,52,0.1)'}`,
      background: selected ? 'rgba(182,67,32,0.1)' : 'transparent',
      color: selected ? primary : olive,
    }}
  >
    {label}
  </div>
);

const PrimaryButton: React.FC<{label: string; disabled?: boolean; pressed?: boolean}> = ({label, disabled, pressed}) => (
  <div
    style={{
      height: 48,
      borderRadius: 16,
      background: primary,
      color: colors.crema,
      fontSize: 14,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 28px -18px rgba(45,74,52,0.28)',
      opacity: disabled ? 0.5 : 1,
      transform: pressed ? 'scale(0.97)' : 'none',
    }}
  >
    {label}
  </div>
);

// —— Pantalla: /sugerir-emprendimiento ——
const X = 16;
/** Posiciones (y, px lógicos, sin scroll) de cada bloque del formulario. */
export const FORM = {
  volver: STATUS_H + 16,
  h1: STATUS_H + 60,
  intro: STATUS_H + 128,
  info: STATUS_H + 198,
  nombre: 398,
  instagram: 492,
  whatsapp: 586,
  zona: 680,
  envios: 774,
  categorias: 818,
  modalidad: 1044,
  aviso: 1126,
  enviar: 1204,
  alto: 1360,
} as const;
/** Centro vertical del input que arranca en un label en `y`. */
export const inputCenter = (y: number) => y + 22 + 24;
export const chipCenter = {x: X + 52, y: FORM.categorias + 48 + 17};
export const enviarCenter = FORM.enviar + 24;

type FormState = {
  scroll: number;
  instagram: string;
  zona: string;
  focus: 'instagram' | 'zona' | null;
  caretOn: boolean;
  categoria: boolean;
  enviando: boolean;
  enviarPressed: boolean;
};

const Abs: React.FC<{y: number; children: React.ReactNode}> = ({y, children}) => (
  <div style={{position: 'absolute', left: X, right: X, top: y}}>{children}</div>
);

const Field: React.FC<{y: number; label: string; children: React.ReactNode}> = ({y, label, children}) => (
  <Abs y={y}>
    <Label>{label}</Label>
    <div style={{height: 8}} />
    {children}
  </Abs>
);

const Checkbox: React.FC<{y: number; label: string}> = ({y, label}) => (
  <Abs y={y}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: olive}}>
      <div style={{width: 16, height: 16, borderRadius: 4, border: `1px solid ${colors.borde}`, background: '#fff'}} />
      {label}
    </div>
  </Abs>
);

export const SugerirScreen: React.FC<FormState> = (s) => (
  <div style={{position: 'absolute', inset: 0, background: colors.cremaFondo, overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: -s.scroll, height: FORM.alto}}>
      <Abs y={FORM.volver}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: muted}}>
          <ArrowLeft size={16} color={muted} />
          Volver
        </div>
      </Abs>
      <Abs y={FORM.h1}>
        <div style={{fontSize: 24, fontWeight: 700, lineHeight: 1.25, color: olive}}>¿Conocés un emprendimiento sin gluten?</div>
      </Abs>
      <Abs y={FORM.intro}>
        <p style={{margin: 0, fontSize: 14, lineHeight: 1.6, color: muted}}>
          Ayudanos a sumar marcas y proyectos que le hacen la vida más fácil a la comunidad celíaca.
        </p>
      </Abs>
      <Abs y={FORM.info}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 16,
            borderRadius: 24,
            border: '1px solid rgba(45,74,52,0.1)',
            background: 'rgba(255,255,255,0.02)',
            fontSize: 14,
            lineHeight: 1.5,
            color: muted,
          }}
        >
          <Info size={20} color="rgba(182,67,32,0.8)" style={{flexShrink: 0}} />
          <p style={{margin: 0}}>
            <strong style={{color: olive}}>¿Tiene local abierto al público?</strong> Sugerilo en{' '}
            <span style={{color: primary}}>Sugerir lugar</span> para el mapa. Acá van marcas por Instagram, WhatsApp,
            delivery o ferias.
          </p>
        </div>
      </Abs>
      <Field y={FORM.nombre} label="Nombre del emprendimiento *">
        <Input placeholder="Ej: Pan Sin TACC de María" />
      </Field>
      <Field y={FORM.instagram} label="Instagram">
        <Input
          value={s.instagram}
          placeholder="@marca o link"
          focused={s.focus === 'instagram'}
          caret={s.focus === 'instagram' && s.caretOn}
        />
      </Field>
      <Field y={FORM.whatsapp} label="WhatsApp o contacto">
        <Input placeholder="+54 11 ..." />
      </Field>
      <Field y={FORM.zona} label="Ciudad / zona *">
        <Input
          value={s.zona}
          placeholder="Ej: CABA, La Plata, Rosario"
          focused={s.focus === 'zona'}
          caret={s.focus === 'zona' && s.caretOn}
        />
      </Field>
      <Checkbox y={FORM.envios} label="¿Hace envíos a todo el país?" />
      <Abs y={FORM.categorias}>
        <Label>Categorías *</Label>
        <div style={{fontSize: 12, color: muted, marginTop: 8}}>Podés elegir más de una.</div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10}}>
          {VENTURE_CATEGORIES.map((c, i) => (
            <Chip key={c} label={c} selected={i === 0 && s.categoria} />
          ))}
        </div>
      </Abs>
      <Abs y={FORM.modalidad}>
        <Label>Modalidad</Label>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10}}>
          {VENTURE_MODALITIES.map((m) => (
            <Chip key={m} label={m} />
          ))}
        </div>
      </Abs>
      <Abs y={FORM.aviso}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 16,
            borderRadius: 24,
            border: `1px solid rgba(${amber},0.2)`,
            background: `rgba(${amber},0.05)`,
            fontSize: 12,
            lineHeight: 1.5,
            color: muted,
          }}
        >
          <AlertCircle size={16} color={`rgba(${amber},0.8)`} style={{flexShrink: 0, marginTop: 2}} />
          <p style={{margin: 0}}>Las sugerencias son revisadas antes de publicarse.</p>
        </div>
      </Abs>
      <Abs y={FORM.enviar}>
        <PrimaryButton label={s.enviando ? 'Enviando...' : 'Enviar sugerencia'} disabled={s.enviando} pressed={s.enviarPressed} />
      </Abs>
    </div>
    <BottomNav active="sugerir" />
  </div>
);

// —— Estado "submitted" ——
/** Centro del botón "Ver emprendimientos". */
export const VER_BTN = {x: 195, y: STATUS_H + 150 + 64 + 16 + 32 + 8 + 45 + 32 + 24};

export const GraciasScreen: React.FC<{titulo: React.ReactNode; check: number; pop: number; verPressed?: boolean}> = ({
  titulo,
  check,
  pop,
  verPressed,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: colors.cremaFondo,
      padding: `${STATUS_H + 150}px 28px 0`,
      textAlign: 'center',
    }}
  >
    <div style={{display: 'flex', justifyContent: 'center', transform: `scale(${pop})`, marginBottom: 16}}>
      <CheckCircle2 size={64} color={colors.verde} progress={check} />
    </div>
    <div style={{fontSize: 24, fontWeight: 700, color: olive, marginBottom: 8, height: 32}}>{titulo}</div>
    <p style={{margin: '0 0 32px', fontSize: 14, lineHeight: 1.6, color: muted, height: 45}}>
      Revisamos cada sugerencia antes de publicarla. Te avisamos por email cuando esté online.
    </p>
    <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
      <PrimaryButton label="Ver emprendimientos" pressed={verPressed} />
      <div
        style={{
          height: 44,
          borderRadius: 16,
          border: `1px solid ${olive}`,
          background: colors.crema,
          color: olive,
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Sugerir otro
      </div>
    </div>
    <BottomNav active="sugerir" />
  </div>
);
