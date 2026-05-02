import { useLanguage } from '../context/LanguageContext';

interface LangToggleProps {
  style?: React.CSSProperties;
}

export default function LangToggle({ style }: LangToggleProps) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      title={lang === 'en' ? 'Switch to Hindi / हिंदी में बदलें' : 'Switch to English'}
      style={{
        display: 'flex', alignItems: 'center',
        border: '1px solid #1e2d3d', borderRadius: 4, overflow: 'hidden',
        flexShrink: 0, ...style,
      }}
    >
      {(['en', 'hi'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: '3px 9px',
            background: lang === l ? '#3b9eff22' : 'transparent',
            border: 'none',
            borderRight: l === 'en' ? '1px solid #1e2d3d' : 'none',
            color: lang === l ? '#3b9eff' : '#5a7a94',
            fontFamily: l === 'hi' ? 'Noto Sans Devanagari, IBM Plex Mono, monospace' : 'IBM Plex Mono, monospace',
            fontSize: l === 'hi' ? 12 : 10,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 0.5,
            transition: 'all .15s',
            lineHeight: 1.4,
          }}
        >
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
}
