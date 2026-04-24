import { useState, useCallback } from 'react';
import { FormInput, Plus, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Block } from './types';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

export function FormBlockComponent({ block, editable, onUpdate, onDelete }: FormBlockProps) {
  const [fields, setFields] = useState<FormField[]>(block.data?.fields || []);
  const [formTitle, setFormTitle] = useState(block.data?.title || 'Untitled Form');
  const [submissions, setSubmissions] = useState<any[]>(block.data?.submissions || []);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [showSubmissions, setShowSubmissions] = useState(false);

  const saveData = useCallback((newFields: FormField[], newTitle?: string, newSubmissions?: any[]) => {
    onUpdate({ 
      fields: newFields, 
      title: newTitle || formTitle,
      submissions: newSubmissions || submissions 
    });
  }, [onUpdate, formTitle, submissions]);

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      label: `New ${type} field`,
      type,
      required: false,
      placeholder: '',
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    saveData(newFields);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    const newFields = fields.map(f => f.id === id ? { ...f, ...updates } : f);
    setFields(newFields);
    saveData(newFields);
  };

  const deleteField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    saveData(newFields);
  };

  const handleSubmit = () => {
    const newSubmission = { id: Date.now().toString(), data: formValues, submittedAt: new Date().toISOString() };
    const newSubmissions = [...submissions, newSubmission];
    setSubmissions(newSubmissions);
    saveData(fields, formTitle, newSubmissions);
    setFormValues({});
    toast.success('Form submitted!');
  };

  return (
    <div className="my-2 rounded-lg bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <FormInput className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Form</span>
        </div>
        {editable && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="p-4">
        {/* Form Title */}
        {editable ? (
          <Input
            value={formTitle}
            onChange={e => {
              setFormTitle(e.target.value);
              saveData(fields, e.target.value);
            }}
            className="text-lg font-semibold mb-4"
          />
        ) : (
          <h3 className="text-lg font-semibold mb-4">{formTitle}</h3>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {fields.map(field => (
            <div key={field.id} className="group">
              <div className="flex items-center justify-between mb-1">
                {editable ? (
                  <Input
                    value={field.label}
                    onChange={e => updateField(field.id, { label: e.target.value })}
                    className="h-7 text-sm font-medium w-auto"
                  />
                ) : (
                  <label className="text-sm font-medium">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </label>
                )}
                {editable && (
                  <button onClick={() => deleteField(field.id)} className="opacity-0 group-hover:opacity-100">
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>
              
              {field.type === 'textarea' ? (
                <textarea
                  value={formValues[field.id] || ''}
                  onChange={e => setFormValues({ ...formValues, [field.id]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background"
                  disabled={editable}
                />
              ) : field.type === 'select' ? (
                <select
                  value={formValues[field.id] || ''}
                  onChange={e => setFormValues({ ...formValues, [field.id]: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background"
                  disabled={editable}
                >
                  <option value="">Select...</option>
                  {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={formValues[field.id] || false}
                  onChange={e => setFormValues({ ...formValues, [field.id]: e.target.checked })}
                  className="h-4 w-4"
                  disabled={editable}
                />
              ) : (
                <Input
                  type={field.type}
                  value={formValues[field.id] || ''}
                  onChange={e => setFormValues({ ...formValues, [field.id]: e.target.value })}
                  placeholder={field.placeholder}
                  disabled={editable}
                />
              )}
            </div>
          ))}
        </div>

        {/* Add Field Buttons (Edit Mode) */}
        {editable && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(['text', 'email', 'number', 'textarea', 'select', 'checkbox', 'date'] as const).map(type => (
              <Button key={type} variant="outline" size="sm" onClick={() => addField(type)}>
                <Plus className="w-3 h-3 mr-1" />
                {type}
              </Button>
            ))}
          </div>
        )}

        {/* Submit Button (View Mode) */}
        {!editable && fields.length > 0 && (
          <Button className="mt-4" onClick={handleSubmit}>Submit</Button>
        )}

        {/* Submissions (Edit Mode) */}
        {editable && submissions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setShowSubmissions(!showSubmissions)}
              className="flex items-center gap-2 text-sm font-medium"
            >
              {showSubmissions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {submissions.length} submissions
            </button>
            {showSubmissions && (
              <div className="mt-2 space-y-2 max-h-60 overflow-auto">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-2 bg-muted rounded text-xs">
                    <p className="text-muted-foreground mb-1">{new Date(sub.submittedAt).toLocaleString()}</p>
                    {Object.entries(sub.data).map(([key, val]) => {
                      const field = fields.find(f => f.id === key);
                      return <p key={key}><strong>{field?.label || key}:</strong> {String(val)}</p>;
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
