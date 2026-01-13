import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function TemplateSelector({ templates, onSelect, selectedId = 'custom' }) {
  const [selected, setSelected] = useState(selectedId);

  const handleSelect = (template) => {
    setSelected(template.id);
    onSelect(template);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary-600" />
        <label className="block text-sm font-medium text-gray-700">
          Usa un template
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleSelect(template)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              selected === template.id
                ? 'border-primary-600 bg-primary-50 shadow-sm'
                : 'border-gray-200 hover:border-primary-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm mb-1 ${
                  selected === template.id ? 'text-primary-900' : 'text-gray-900'
                }`}>
                  {template.name}
                </div>
                <div className="text-xs text-gray-600 line-clamp-2">
                  {template.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
