import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createComment, Comment } from '@/integrations/supabase/articles';

interface CommentFormProps {
  articleId: string;
  onCommentSubmitted: (newComment: Comment) => void;
}

const CommentForm = ({ articleId, onCommentSubmitted }: CommentFormProps) => {
  const [displayName, setDisplayName] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Comment cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newComment = await createComment(articleId, content.trim(), displayName.trim());
      onCommentSubmitted(newComment);
      // Reset form
      setDisplayName('');
      setContent('');
    } catch (err: any) {
      setError('Failed to post comment. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <h3 className="text-lg font-semibold">Leave a Comment</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Your Name (Optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isSubmitting}
          />
          <Textarea
            placeholder="Write your comment here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            required
            disabled={isSubmitting}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CommentForm;
