import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ArticlePage() {
  const [, params] = useRoute("/help/documentation/article/:articleId");
  const articleId = params?.articleId || '';
  
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading article data
    setLoading(true);
    
    // In a real app, this would fetch from an API
    setTimeout(() => {
      // This is placeholder content. In a real application, we would fetch from an API
      setArticle({
        title: "Article: " + decodeURIComponent(articleId).replace(/-/g, ' '),
        content: `
          <div>
            <p class="lead mb-4">This is a sample article page that demonstrates how articles would be displayed.</p>
            <p class="mb-4">In a production environment, the content for "<strong>${decodeURIComponent(articleId).replace(/-/g, ' ')}</strong>" would be loaded from a content management system or database.</p>
            <h2 class="text-xl font-semibold mb-2 mt-6">Article Details</h2>
            <p class="mb-4">This page is designed to show how dynamic article pages would work in the knowledge base system. The actual content would include comprehensive information on the requested topic.</p>
            <h2 class="text-xl font-semibold mb-2 mt-6">Related Resources</h2>
            <ul class="list-disc pl-6 mb-6 space-y-2">
              <li><a href="/help/documentation/KnowledgeBase" class="text-primary hover:underline">Return to Knowledge Base</a></li>
              <li><a href="/help/documentation/GettingStartedGuide" class="text-primary hover:underline">Getting Started Guide</a></li>
              <li><a href="/help" class="text-primary hover:underline">Help & Support Home</a></li>
            </ul>
          </div>
        `,
        createdAt: new Date().toLocaleDateString(),
        updatedAt: new Date().toLocaleDateString(),
        readTime: '5 min read',
      });
      
      setLoading(false);
    }, 800);
  }, [articleId]);
  
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 mb-20">
      <Link href="/help/documentation/KnowledgeBase">
        <Button variant="ghost" className="mb-4 pl-0 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Knowledge Base</span>
        </Button>
      </Link>
      
      {loading ? (
        <>
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-3/4 mb-6" />
          
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-5/6 mb-6" />
          
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-5 w-1/3 mb-2" />
          <Skeleton className="h-5 w-1/2 mb-2" />
          <Skeleton className="h-5 w-2/5 mb-6" />
        </>
      ) : article ? (
        <>
          <div className="border-b pb-4 mb-6">
            <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Updated: {article.updatedAt}</span>
              <span className="mx-2">•</span>
              <span>{article.readTime}</span>
            </div>
          </div>
          
          <div 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Was this article helpful?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button variant="outline">Yes</Button>
                <Button variant="outline">No</Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Article Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find the article you're looking for.
          </p>
          <Link href="/help/documentation/KnowledgeBase">
            <Button>Return to Knowledge Base</Button>
          </Link>
        </div>
      )}
    </div>
  );
}