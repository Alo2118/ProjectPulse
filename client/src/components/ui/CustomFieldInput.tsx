/**
 * CustomFieldInput - Dynamic input renderer based on custom field type
 * @module components/ui/CustomFieldInput
 */

import { CustomFieldType } from '@/types'

interface CustomFieldInputProps {
  fieldType: CustomFieldType
  value: string | null
  options?: string[] | null
  onChange: (value: string | null) => void
  readOnly?: boolean
  placeholder?: string
  required?: boolean
  id?: string
}

export function CustomFieldInput({
  fieldType,
  value,
  options,
  onChange,
  readOnly = false,
  placeholder,
  required = false,
  id,
}: CustomFieldInputProps) {
  const baseInputClass =
    'w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60 disabled:cursor-not-allowed'

  switch (fieldType) {
    case 'text':
      return (
        <input
          id={id}
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={readOnly}
          required={required}
          placeholder={placeholder ?? 'Inserisci testo...'}
          className={baseInputClass}
        />
      )

    case 'number':
      return (
        <input
          id={id}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={readOnly}
          required={required}
          placeholder={placeholder ?? '0'}
          className={baseInputClass}
        />
      )

    case 'dropdown':
      return (
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={readOnly}
          required={required}
          className={baseInputClass}
        >
          <option value="">-- Seleziona --</option>
          {(options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )

    case 'date':
      return (
        <input
          id={id}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={readOnly}
          required={required}
          className={baseInputClass}
        />
      )

    case 'checkbox':
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            id={id}
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            disabled={readOnly}
            required={required}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {value === 'true' ? 'Sì' : 'No'}
          </span>
        </label>
      )

    default:
      return null
  }
}
