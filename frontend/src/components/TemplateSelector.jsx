import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function TemplateSelector({ templates, onSelect, selectedId = 'custom' }) {
  const { colors, spacing } = useTheme();
  const [selected, setSelected] = useState(selectedId);

  const handleSelect = (template) => {
    setSelected(template.id);
    onSelect(template);
  };

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className={`h-4 w-4 ${colors.text.accent}`} />
        <label className="text-label block">Usa un template</label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleSelect(template)}
            className={`rounded-lg border-2 p-3 text-left transition-all ${
              selected === template.id
                ? 'border-cyan-500 bg-cyan-500/10 shadow-md shadow-cyan-500/20'
                : `${colors.border} ${colors.bg.secondary} hover:border-cyan-500/40`
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">{template.icon}</span>
              <div className="min-w-0 flex-1">
                <div
                  className={`mb-1 text-sm font-medium ${
                    selected === template.id ? colors.text.accent : colors.text.primary
                  }`}
                >
                  {template.name}
                </div>
                <div className={`line-clamp-2 text-xs ${colors.text.tertiary}`}>{template.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
