## Today's Development Backup

This file contains a backup of the components and pages that were created and modified today.

### 1. Image Uploader Component (`src/components/admin/ImageUploader.tsx`)

This component provides a reusable drag-and-drop interface for uploading images to a specified Supabase storage bucket.

```typescript
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Trash2, UploadCloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ImageUploaderProps {
  bucketName: 'event-media' | 'article-media';
  existingImageUrls: string[];
  onUploadComplete: (urls: string[]) => void;
  onRemoveImage: (url: string) => void;
}

const ImageUploader = ({ bucketName, existingImageUrls, onUploadComplete, onRemoveImage }: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];
    const totalSize = acceptedFiles.reduce((acc, file) => acc + file.size, 0);
    let uploadedSize = 0;

    for (const file of acceptedFiles) {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Upload Error:', error);
      } else if (data) {
        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
        uploadedUrls.push(urlData.publicUrl);
      }
      
      uploadedSize += file.size;
      setUploadProgress((uploadedSize / totalSize) * 100);
    }
    
    onUploadComplete(uploadedUrls);
    setIsUploading(false);
  }, [bucketName, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif'] },
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
            <UploadCloud className="w-12 h-12 text-gray-400" />
            <p className="text-gray-500">
            {isDragActive ? 'Drop the files here...' : "Drag 'n' drop some files here, or click to select files"}
            </p>
        </div>
      </div>
      
      {isUploading && <Progress value={uploadProgress} className="w-full" />}

      {existingImageUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {existingImageUrls.map((url) => (
            <div key={url} className="relative group">
              <img src={url} alt="Uploaded content" className="w-full h-32 object-cover rounded-md" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveImage(url)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
```

### 2. Rich Text Editor Component (`src/components/admin/RichTextEditor.tsx`)

This component encapsulates the `react-quill` rich-text editor, providing a standardized toolbar and interface.

```typescript
import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Ensure this CSS is imported

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const editorModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    ['link', 'image'],
    [{ 'align': [] }],
    ['clean']
  ],
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={editorModules}
      placeholder={placeholder}
      style={{ backgroundColor: 'white' }}
    />
  );
};

export default RichTextEditor;
```

### 3. Article Editor Page (`src/pages/ArticleEditor.tsx`)

This is the main page for creating and editing articles. It was updated to include the new author information section and the rich-text editor.

```typescript
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
```