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
      image: "/assets/images/home-page-image1.JPG",
      objectPosition: "center 25%"
    },
    {
      title: "Pioneering Research",
      subtitle: "Discover groundbreaking studies and innovative approaches to healthcare",
      image: "/assets/images/home-page-image2.jpg"
    },
    {
      title: "Inspiring Future Scientists",
      subtitle: "Building the next generation of medical and scientific leaders",
      image: "/assets/images/home-page-image3.jpg"
    },
    {
      title: "Collaboration and Innovation",
      subtitle: "Fostering a culture of teamwork and discovery",
      image: "/assets/images/home-page-image4.jpg"
    }
  ];

  const milestones = [
    { year: "2018", title: "Club Founded", description: "Life Savers club was established" },
    { year: "2019", title: "First event", description: "Organizing our first event" },
    { year: "2020", title: "Expansion", description: "We have been involved in over five national and university-level events" },
    { year: "2024", title: "National Event", description: "We participated in National Pixel Event" },
    { year: "2025", title: "the National Congress of Forensic Medicine", description: "Participates in the organization of the National Congress of Forensic Medicine" },
  ];

  const featuredArticles = [
    {
      id: 1,
      title: "Advances in Cardiac Care",
      excerpt: "Exploring new treatment methods for cardiovascular diseases",
      category: "Medicine",
      image: "/assets/images/soon.png"
    },
    {
      id: 2,
      title: "Dental Innovation",
      excerpt: "Revolutionary techniques in modern dentistry",
      category: "Dental Medicine",
      image: "/assets/images/soon.png"
    },
    {
      id: 3,
      title: "Pharmaceutical Breakthroughs",
      excerpt: "New drug development and delivery systems",
      category: "Pharmacy",
      image: "/assets/images/soon.png"
    }
  ];

  const testimonials = [
    {
      quote: "This club helped me gain real experience. By joining different sectors, I learned new skills—from organization to teamwork to leadership. It taught me things you don’t learn in class.",
      author: "Dr. Kawthar Ali Dehmani",
      role: "Pharmaceutical Researcher",
      avatar: "/placeholder.svg"
    },
    {
      quote: "Joining this club was one of my best decisions. I built long-term, meaningful connections that I know will help me in the future. I truly recommend joining.",
      author: "Dr. Oussama Yahia",
      role: "Graduate Dentist",
      avatar: "/placeholder.svg"
    },
    {
      quote: "Thanks to the club, I attended major events, traveled with the team, and found a balance between study and life. It really helped reduce academic stress.",
      author: "Dr. Habib Beneddine",
      role: "Medical Student",
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
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 z-10" />
                <img 
                  src={slide.image} 
                  alt={slide.title}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: slide.objectPosition || 'center' }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-center px-4 z-20">
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
              About Lifesavers Club
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              ✨ Lifesavers Club ✨<br/>
              Opened on October 23th, 2018, our mission has always been simple: We spread health, we spread hope.
            </p>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              At Lifesavers Club, we work together to promote wellness, raise awareness, and build a healthier community. Our activities include educational workshops, health-focused events, volunteering programs, and interactive sessions that empower students to learn, care, and take action.
              <br/><br/>
              Join us on our journey because every small act of care can save a life. ❤️
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
              src="/assets/images/about-us-placeholder.JPG" 
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
                  <Button variant="pill" size="sm" disabled>
                    Soon
                  </Button>
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
          onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Contact Us
        </Button>
      </section>
    </div>
  );
};

export default NewHome;
