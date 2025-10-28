import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Microscope, Users, BookOpen } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const NewHome = () => {
  const heroSlides = [
    {
      title: "Advancing Science Together",
      subtitle: "Join our community of passionate researchers and healthcare professionals",
      image: "/placeholder.svg"
    },
    {
      title: "Pioneering Research",
      subtitle: "Discover groundbreaking studies and innovative approaches to healthcare",
      image: "/placeholder.svg"
    },
    {
      title: "Inspiring Future Scientists",
      subtitle: "Building the next generation of medical and scientific leaders",
      image: "/placeholder.svg"
    }
  ];

  const milestones = [
    { year: "2018", title: "Club Founded", description: "Life Savers Hub was established" },
    { year: "2019", title: "First Publication", description: "Published our first scientific article" },
    { year: "2020", title: "100 Members", description: "Reached 100 active members" },
    { year: "2022", title: "National Recognition", description: "Awarded Best Scientific Club" },
    { year: "2024", title: "International Collaboration", description: "Partnered with global institutions" },
  ];

  const featuredArticles = [
    {
      id: 1,
      title: "Advances in Cardiac Care",
      excerpt: "Exploring new treatment methods for cardiovascular diseases",
      category: "Medicine",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      title: "Dental Innovation",
      excerpt: "Revolutionary techniques in modern dentistry",
      category: "Dental Medicine",
      image: "/placeholder.svg"
    },
    {
      id: 3,
      title: "Pharmaceutical Breakthroughs",
      excerpt: "New drug development and delivery systems",
      category: "Pharmacy",
      image: "/placeholder.svg"
    }
  ];

  const testimonials = [
    {
      quote: "Life Savers Hub transformed my academic journey and connected me with incredible mentors.",
      author: "Dr. Sarah Johnson",
      role: "Cardiologist",
      avatar: "/placeholder.svg"
    },
    {
      quote: "The research opportunities and collaborative environment are unmatched.",
      author: "Michael Chen",
      role: "Medical Student",
      avatar: "/placeholder.svg"
    },
    {
      quote: "A supportive community that truly values scientific excellence and innovation.",
      author: "Dr. Emily Rodriguez",
      role: "Pharmaceutical Researcher",
      avatar: "/placeholder.svg"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Slider */}
      <Carousel
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 5000 })]}
        className="w-full"
      >
        <CarouselContent>
          {heroSlides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="relative h-[500px] md:h-[600px] w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/90" />
                <img 
                  src={slide.image} 
                  alt={slide.title}
                  className="w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                  <div className="max-w-4xl">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                      {slide.title}
                    </h1>
                    <p className="text-xl md:text-2xl text-white/90">
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* About Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
              About Life Savers Hub
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Life Savers Hub is a premier scientific club dedicated to advancing healthcare 
              knowledge and fostering a community of passionate researchers, students, and 
              professionals in the medical and pharmaceutical fields.
            </p>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Our mission is to create a collaborative environment where innovation thrives, 
              knowledge is shared, and future healthcare leaders are inspired to make a 
              meaningful impact on society.
            </p>
            <Link to="/members">
              <Button variant="pill" size="lg">
                Meet Our Team
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="relative h-[400px] rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
            <img 
              src="/placeholder.svg" 
              alt="About Life Savers"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Milestones Timeline */}
      <section className="bg-secondary/20 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
            Our Journey
          </h2>
          <div className="max-w-3xl mx-auto space-y-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex gap-4 items-start animate-fade-in">
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="text-2xl font-bold text-accent">{milestone.year}</span>
                </div>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary mt-2" />
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-1">{milestone.title}</h3>
                  <p className="text-muted-foreground">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
          Featured Articles
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {featuredArticles.map((article) => (
            <Card key={article.id} className="overflow-hidden hover:shadow-[var(--shadow-card)] transition-shadow">
              <img 
                src={article.image} 
                alt={article.title}
                className="w-full h-48 object-cover"
              />
              <CardContent className="p-6">
                <span className="text-xs font-semibold text-accent">{article.category}</span>
                <h3 className="text-xl font-bold mt-2 mb-3">{article.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{article.excerpt}</p>
                <Link to="/articles">
                  <Button variant="pill" size="sm">
                    Read More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Link to="/articles">
            <Button variant="pill" size="lg">
              View All Articles
            </Button>
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-secondary/20 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary">
            What Our Members Say
          </h2>
          <Carousel
            opts={{ loop: true }}
            plugins={[Autoplay({ delay: 4000 })]}
            className="max-w-4xl mx-auto"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index}>
                  <Card className="p-8 text-center">
                    <CardContent className="pt-6">
                      <p className="text-lg italic text-muted-foreground mb-6">
                        "{testimonial.quote}"
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <img 
                          src={testimonial.avatar} 
                          alt={testimonial.author}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="text-left">
                          <p className="font-semibold">{testimonial.author}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </section>

      {/* Contact Teaser */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
          Get in Touch
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Have questions or want to learn more about joining Life Savers Hub? 
          We'd love to hear from you.
        </p>
        <Button 
          variant="pill" 
          size="lg"
          onClick={() => document.querySelector('footer')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Contact Us
        </Button>
      </section>
    </div>
  );
};

export default NewHome;
