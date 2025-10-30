import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

const Articles = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const articles = [
    {
      id: 1,
      slug: "advances-cardiac-care",
      title: "Advances in Cardiac Care",
      excerpt: "Exploring new treatment methods for cardiovascular diseases and patient outcomes.",
      category: "Medicine",
      author: "Dr. Sarah Johnson",
      date: "March 10, 2024",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      slug: "dental-innovation",
      title: "Dental Innovation",
      excerpt: "Revolutionary techniques in modern dentistry and oral healthcare.",
      category: "Dental Medicine",
      author: "Dr. Michael Chen",
      date: "March 8, 2024",
      image: "/placeholder.svg"
    },
    {
      id: 3,
      slug: "pharmaceutical-breakthroughs",
      title: "Pharmaceutical Breakthroughs",
      excerpt: "New drug development and delivery systems transforming patient care.",
      category: "Pharmacy",
      author: "Dr. Emily Rodriguez",
      date: "March 5, 2024",
      image: "/placeholder.svg"
    }
  ];

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || article.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen">
      {/* Sticky Search & Filter Bar */}
      <div className="sticky top-16 bg-background/95 backdrop-blur-sm border-b border-border z-40 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="w-full md:w-auto rounded-full">
                <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
                <TabsTrigger value="Medicine" className="rounded-full">Medicine</TabsTrigger>
                <TabsTrigger value="Dental Medicine" className="rounded-full">Dental</TabsTrigger>
                <TabsTrigger value="Pharmacy" className="rounded-full">Pharmacy</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container mx-auto px-4 py-12">
        {filteredArticles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
                <img 
                  src={article.image} 
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
                <CardContent className="p-6">
                  <span className="text-xs font-semibold text-accent">{article.category}</span>
                  <h3 className="text-xl font-bold mt-2 mb-3">{article.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>{article.author}</span>
                    <span>{article.date}</span>
                  </div>
                  <Link to={`/articles/${article.slug}`}>
                    <Button variant="pill" size="sm">
                      Read More
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">No articles found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Articles;
