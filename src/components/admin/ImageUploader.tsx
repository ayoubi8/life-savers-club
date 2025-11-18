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
