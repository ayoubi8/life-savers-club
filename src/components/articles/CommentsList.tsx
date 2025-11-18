import { Card, CardContent } from '@/components/ui/card';
import { Comment } from '@/integrations/supabase/articles';

interface CommentsListProps {
  comments: Comment[];
}

const CommentsList = ({ comments }: CommentsListProps) => {
  if (comments.length === 0) {
    return <p className="text-gray-500">No comments yet. Be the first to comment!</p>;
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <Card key={comment.id}>
          <CardContent className="pt-6">
            <div className="flex items-center mb-2">
                <p className="font-semibold">{comment.display_name || 'Anonymous'}</p>
                <span className="text-xs text-gray-500 mx-2">&bull;</span>
                <p className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                </p>
            </div>
            <p>{comment.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CommentsList;
