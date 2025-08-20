import { Link } from 'react-router-dom';
import { ArrowRight, Grid3X3 } from 'lucide-react';
import { URLInput } from '@/components/URLInput';
import { Button } from '@/components/ui/button';
import SplitText from '@/blocks/TextAnimations/SplitText/SplitText';

import { useState } from "react"

export default function VideosView() {
  const [played, setPlayed] = useState(false)
  return (
    <div className="h-full overflow-auto">
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl mx-auto space-y-18">
          {/* Hero Section */}
          <div className="text-center space-y-3">
            <SplitText
              text="Summarize YouTube Videos"
              className="text-5xl font-bold tracking-tight"
              splitType="chars"
              delay={15}
              duration={0.4}
              ease="back.out"
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
            />
            <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Enter a URL, get a summary.
            </p>
          </div>
          
          {/* Centered URL Input */}
          <URLInput />
          
          {/* Browse Videos Link */}
          <div className="flex justify-center pt-8">
            <Button variant="outline" asChild>
              <Link to="/videos" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Browse All Videos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
