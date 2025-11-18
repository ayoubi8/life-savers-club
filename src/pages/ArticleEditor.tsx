import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createArticle, updateArticle, getArticleBySlug } from '@/integrations/supabase/articles';
import { toast } from 'sonner';
import ImageUploader from '@/components/admin/ImageUploader';
import RichTextEditor from '@/components/admin/RichTextEditor';

// Updated Zod schema
const articleSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  slug: z.string().min(3, 'Slug must be at least 3 characters.').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']),
  category: z.enum(['Medicine', 'Dental', 'Pharmacy']),
  published_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  
  // Author fields
  author_name: z.string().min(2, 'Author name is required.'),
  author_email: z.string().email('Invalid email address.'),
  author_social: z.object({
    instagram: z.string().url().optional().or(z.literal('')),
    facebook: z.string().url().optional().or(z.literal(''))
  }),
  author_avatar_url: z.string().url().optional().or(z.literal('')), // New avatar field

  // Image & Content fields
  cover_image: z.string().url('A cover image is required.').min(1, 'A cover image is required.'),
  gallery_images: z.array(z.string().url()).optional(),
  excerpt: z.string().min(10, 'Excerpt must be at least 10 characters.').max(200, 'Excerpt must be 200 characters or less.'),
  content: z.string().min(100, 'Full content must be at least 100 characters.')
});

type ArticleFormData = z.infer<typeof articleSchema>;

const ArticleEditor = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isEditing = !!slug;
  const [isLoading, setIsLoading] = useState(isEditing);

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: '',
      slug: '',
      status: 'draft',
      category: 'Medicine',
      published_at: new Date().toISOString().split('T')[0],
      author_name: '',
      author_email: '',
      author_social: { instagram: '', facebook: '' },
      author_avatar_url: '',
      cover_image: '',
      gallery_images: [],
      excerpt: '',
      content: ''
    }
  });

  useEffect(() => {
    if (isEditing) {
      const fetchArticle = async () => {
        setIsLoading(true);
        try {
          const article = await getArticleBySlug(slug, true);
          if (article) {
            form.reset({
              ...(article as any),
              published_at: new Date(article.published_at).toISOString().split('T')[0],
              author_social: {
                  instagram: article.author_social?.instagram || '',
                  facebook: article.author_social?.facebook || ''
              },
              author_avatar_url: (article as any).author_avatar_url || '',
              gallery_images: Array.isArray(article.gallery_images) ? article.gallery_images : []
            });
          } else {
            toast.error('Article not found.');
            navigate('/admin/articles');
          }
        } catch (error) {
          toast.error('Failed to load article.', { description: (error as Error).message });
        } finally {
          setIsLoading(false);
        }
      };
      fetchArticle();
    }
  }, [slug, isEditing, navigate, form]);

  const onSubmit = async (data: ArticleFormData) => {
    const promise = isEditing
      ? updateArticle(slug, data)
      : createArticle(data);

    toast.promise(promise, {
      loading: isEditing ? 'Updating article...' : 'Creating article...',
      success: (res) => {
        navigate('/admin/articles');
        return `Article "${res.title}" was ${isEditing ? 'updated' : 'created'} successfully.`;
      },
      error: (err) => `Failed to ${isEditing ? 'update' : 'create'} article. ${err.message}`
    });
  };
  
  if (isLoading) return <p className="text-center py-12">Loading article editor...</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader><CardTitle>{isEditing ? 'Edit Article' : 'Create New Article'}</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Title */}
              <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="slug" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>URL Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField name="status" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="pending_review">Pending Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField name="category" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Medicine">Medicine</SelectItem><SelectItem value="Dental">Dental</SelectItem><SelectItem value="Pharmacy">Pharmacy</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField name="published_at" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Publish Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              {/* Author Information Section */}
              <div className="space-y-4 rounded-md border p-4">
                <h3 className="text-lg font-semibold">Author Information</h3>
                <FormField
                  control={form.control}
                  name="author_avatar_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author Avatar</FormLabel>
                      <FormControl>
                        <ImageUploader
                          bucketName="article-media" // NOTE: Ensure this is the correct bucket for avatars
                          existingImageUrls={field.value ? [field.value] : []}
                          onUploadComplete={(urls) => urls.length > 0 && field.onChange(urls[0])}
                          onRemoveImage={() => field.onChange('')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField name="author_name" control={form.control} render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="author_email" control={form.control} render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="author_social.facebook" control={form.control} render={({ field }) => (<FormItem><FormLabel>Facebook URL</FormLabel><FormControl><Input placeholder="https://facebook.com/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="author_social.instagram" control={form.control} render={({ field }) => (<FormItem><FormLabel>Instagram URL</FormLabel><FormControl><Input placeholder="https://instagram.com/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>

              {/* Content & Images Section */}
              <div className="space-y-4 rounded-md border p-4">
                <h3 className="text-lg font-semibold">Content & Images</h3>
                <FormField
                  control={form.control}
                  name="cover_image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image</FormLabel>
                      <FormControl>
                        <ImageUploader
                          bucketName="article-media"
                          existingImageUrls={field.value ? [field.value] : []}
                          onUploadComplete={(urls) => urls.length > 0 && field.onChange(urls[0])}
                          onRemoveImage={() => field.onChange('')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gallery_images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Optional: Gallery Images</FormLabel>
                      <FormControl>
                        <ImageUploader
                          bucketName="article-media"
                          existingImageUrls={field.value || []}
                          onUploadComplete={(urls) => field.onChange([...(field.value || []), ...urls])}
                          onRemoveImage={(urlToRemove) => field.onChange((field.value || []).filter(url => url !== urlToRemove))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField name="excerpt" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Short Excerpt</FormLabel><FormControl><Textarea rows={4} placeholder="A short, catchy summary..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Content</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Write the full article here..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => navigate('/admin/articles')}>Cancel</Button>
                <Button type="submit">{isEditing ? 'Update Article' : 'Create Article'}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticleEditor;
