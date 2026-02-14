import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface CustomQuestion {
  id?: number;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  orderIndex: number;
  enabled: boolean;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'phone', label: 'Phone Number' },
];

export default function CustomQuestionsBuilder({ bookingLinkId }: { bookingLinkId: number }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: existingQuestions = [], isLoading } = useQuery<CustomQuestion[]>({
    queryKey: [`/api/booking/${bookingLinkId}/questions`],
    enabled: !!bookingLinkId,
  });

  useEffect(() => {
    if (existingQuestions.length > 0) {
      setQuestions(existingQuestions.map(q => ({
        ...q,
        options: (q.options || []) as string[],
      })));
    }
  }, [existingQuestions]);

  const saveMutation = useMutation({
    mutationFn: async (data: { questions: CustomQuestion[] }) => {
      const res = await apiRequest('PUT', `/api/booking/${bookingLinkId}/questions-bulk`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Custom questions saved' });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/booking/${bookingLinkId}/questions`] });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addQuestion = () => {
    setQuestions([...questions, {
      label: '',
      type: 'text',
      required: false,
      options: [],
      orderIndex: questions.length,
      enabled: true,
    }]);
    setHasChanges(true);
  };

  const updateQuestion = (index: number, updates: Partial<CustomQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
    setHasChanges(true);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = [...updated[questionIndex].options, ''];
    setQuestions(updated);
    setHasChanges(true);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
    setHasChanges(true);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
    setHasChanges(true);
  };

  const needsOptions = (type: string) => ['dropdown', 'radio', 'checkbox'].includes(type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm text-neutral-800">Custom Invitee Questions</h3>
          <p className="text-xs text-muted-foreground">Add custom fields to your booking form</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Question
        </Button>
      </div>

      {isLoading ? (
        <div className="h-16 bg-neutral-100 rounded animate-pulse" />
      ) : questions.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-4">
          No custom questions yet. Click "Add Question" to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={index} className="border border-neutral-200 rounded-lg p-3 space-y-3">
              <div className="flex items-start gap-2">
                <GripVertical className="h-5 w-5 text-neutral-300 mt-1 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={question.label}
                      onChange={(e) => updateQuestion(index, { label: e.target.value })}
                      placeholder="Question label"
                      className="flex-1"
                    />
                    <Select
                      value={question.type}
                      onValueChange={(value) => updateQuestion(index, { type: value, options: needsOptions(value) && question.options.length === 0 ? ['Option 1'] : question.options })}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {needsOptions(question.type) && (
                    <div className="pl-4 space-y-1">
                      <Label className="text-xs text-muted-foreground">Options</Label>
                      {question.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex gap-1">
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(index, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="h-8 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => removeOption(index, optIdx)}
                          >
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => addOption(index)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Option
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={question.required}
                        onCheckedChange={(checked) => updateQuestion(index, { required: checked })}
                      />
                      <span className="text-xs text-neutral-500">Required</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(index)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasChanges && (
        <Button
          type="button"
          size="sm"
          onClick={() => saveMutation.mutate({ questions })}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Questions'}
        </Button>
      )}
    </div>
  );
}
