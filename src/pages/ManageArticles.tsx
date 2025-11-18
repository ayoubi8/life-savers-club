import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllArticles, deleteArticle, Article } from '@/integrations/supabase/articles';
import { toast } from 'sonner';

const ManageArticles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const data = await getAllArticles(); // Fetches all articles regardless of status
      setArticles(data);
    } catch (error) {
      toast.error('Failed to fetch articles.', { description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (articleId: string, articleTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete the article "${articleTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteArticle(articleId);
      toast.success(`Article "${articleTitle}" deleted successfully.`);
      // Refresh the list
      setArticles(articles.filter(article => article.id !== articleId));
    } catch (error) {
      toast.error('Failed to delete article.', { description: (error as Error).message });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manage Articles</h1>
        <Link to="/admin/article/new">
          <Button>Create New Article</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Articles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading articles...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Publish Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell>{(article as any).status || 'N/A'}</TableCell>
                    <TableCell>{new Date(article.published_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link to={`/admin/article/edit/${article.slug}`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(article.id, article.title)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageArticles;
