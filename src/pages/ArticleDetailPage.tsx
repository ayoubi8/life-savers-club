import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getArticleBySlug,
  getCommentsByArticleId,
  getApprovedArticles,
  Article,
  ArticleCard,
  Comment,
} from '@/integrations/supabase/articles';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Facebook, Instagram, Mail, Twitter, Linkedin } from 'lucide-react';
import CommentForm from '@/components/articles/CommentForm'; // New Import
import CommentsList from '@/components/articles/CommentsList'; // New Import

const ArticleDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [otherArticles, setOtherArticles] = useState<ArticleCard[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticleData = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);

        const [fetchedArticle, allArticles] = await Promise.all([
          getArticleBySlug(slug),
          getApprovedArticles(),
        ]);

        setArticle(fetchedArticle);

        if (fetchedArticle) {
          const fetchedComments = await getCommentsByArticleId(fetchedArticle.id);
          setComments(fetchedComments);
          setOtherArticles(allArticles.filter(a => a.id !== fetchedArticle.id).slice(0, 5));
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to fetch article data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [slug]);

  // Callback to add a new comment to the list without a full refresh
  const handleCommentSubmitted = useCallback((newComment: Comment) => {
    setComments(prevComments => [newComment, ...prevComments]);
  }, []);

  const SocialShareButtons = () => {
    const url = window.location.href;
    const title = article?.title || '';
    const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    const linkedinShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    return (
        <div className="flex items-center space-x-2 my-4">
            <span className="font-semibold">Share:</span>
            <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="icon"><Twitter className="h-4 w-4" /></Button></a>
            <a href={facebookShareUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="icon"><Facebook className="h-4 w-4" /></Button></a>
            <a href={linkedinShareUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="icon"><Linkedin className="h-4 w-4" /></Button></a>
        </div>
    );
  };

  if (loading) {
      return (
          <div className="container mx-auto px-4 py-8">
              {/* Omitting Skeleton for brevity */}
          </div>
      );
  }

  if (error || !article) {
      return (
          <div className="container mx-auto px-4 py-8 text-center">
              <h2 className="text-2xl font-bold text-red-500">
                  {error ? 'An error occurred fetching the article.' : 'Article not found.'}
              </h2>
              <p>{error}</p>
              <Link to="/articles"><Button className="mt-4">Back to Articles</Button></Link>
          </div>
      );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        {/* ... (existing hero and main content) */}
        {article.cover_image && (
            <img src={article.cover_image} alt={article.title} className="w-full h-64 md:h-96 object-cover rounded-lg mb-4" />
        )}
        <CardTitle className="text-sm font-semibold text-blue-600 mb-2">{(article as any).category?.toUpperCase() || 'ARTICLE'}</CardTitle>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2">{article.title}</h1>
        <p className="text-gray-500 mb-6">Published on {new Date(article.published_at).toLocaleDateString()}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <div className="md:col-span-2">
                <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />

                <hr className="my-12" />

                {/* New Comments Section */}
                <h2 className="text-3xl font-bold mb-6">Comments ({comments.length})</h2>
                <CommentForm articleId={article.id} onCommentSubmitted={handleCommentSubmitted} />
                <CommentsList comments={comments} />
            </div>

            {/* ... (existing sidebar) */}
            <aside>
                {/* Author Block */}
                <Card className="mb-8">
                    <CardHeader className="flex flex-row items-center space-x-4">
                        <Avatar>
                            <AvatarFallback>{article.author_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{article.author_name}</p>
                            <p className="text-sm text-gray-500">Author</p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-3">
                            <a href={`mailto:${article.author_email}`} className="text-gray-500 hover:text-gray-800"><Mail className="h-5 w-5" /></a>
                            {article.author_social?.facebook && <a href={article.author_social.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800"><Facebook className="h-5 w-5" /></a>}
                            {article.author_social?.instagram && <a href={article.author_social.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800"><Instagram className="h-5 w-5" /></a>}
                        </div>
                    </CardContent>
                </Card>

                {/* Social Share */}
                <SocialShareButtons />

                {/* Other Articles */}
                <h3 className="text-xl font-bold mb-4 mt-8">Read Next</h3>
                <div className="space-y-4">
                    {otherArticles.map(other => (
                        <Link key={other.id} to={`/articles/${other.slug}`} className="block hover:bg-gray-50 p-2 rounded-md">
                            <p className="font-semibold text-gray-800">{other.title}</p>
                        </Link>
                    ))}
                </div>
            </aside>
        </div>
    </div>
  );
};

export default ArticleDetailPage;
