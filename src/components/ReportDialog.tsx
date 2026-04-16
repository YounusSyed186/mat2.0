import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const REPORT_REASONS = [
  'Fake profile',
  'Inappropriate content',
  'Harassment',
  'Spam',
  'Misleading information',
  'Other',
];

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
}

export function ReportDialog({ open, onOpenChange, reporterId, reportedUserId, reportedUserName }: ReportDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: 'Please select a reason', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const fullReason = details ? `${reason}: ${details}` : reason;

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        reason: fullReason,
      });

    if (error) {
      toast({ title: 'Failed to submit report', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Report submitted', description: 'Our team will review this report.' });
      onOpenChange(false);
      setReason('');
      setDetails('');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="report-dialog">
        <DialogHeader>
          <DialogTitle>Report {reportedUserName}</DialogTitle>
          <DialogDescription>
            Please tell us why you are reporting this user. Our team will review your report.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger data-testid="report-reason-select">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Additional details (optional)</Label>
            <Textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Provide more context..."
              rows={3}
              data-testid="report-details-input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="report-cancel-btn">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason} variant="destructive" data-testid="report-submit-btn">
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
