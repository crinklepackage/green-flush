import React from 'react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Link from 'next/link';

export default function ComponentsShowcase() {
  return (
    <div className="py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-6">shadcn/ui Components</h1>
        <p className="text-gray-600 mb-2">
          This page showcases the shadcn/ui components we've integrated into the project.
        </p>
        <Link href="/" className="text-blue-600 hover:underline">
          Back to homepage
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Button Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>
              Different button variants and sizes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="default">Default Size</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
                  <path d="M5 12h14"/>
                  <path d="M12 5v14"/>
                </svg>
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              View Button Documentation
            </Button>
          </CardFooter>
        </Card>

        {/* Card Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Card Components</CardTitle>
            <CardDescription>
              Card with header, content, and footer sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Cards can be used to group related content and actions. They support a 
              header, content area, and footer, making them versatile for many UI patterns.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost">Cancel</Button>
            <Button>Save</Button>
          </CardFooter>
        </Card>
      </div>

      {/* Input and Form Components */}
      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
            <CardDescription>
              Input fields, labels, and form elements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Input */}
            <div className="space-y-2">
              <Label htmlFor="basic-input">Basic Input</Label>
              <Input id="basic-input" placeholder="Enter text here..." />
            </div>

            {/* Required Input */}
            <div className="space-y-2">
              <Label htmlFor="required-input">Required Input</Label>
              <Input id="required-input" placeholder="Required field" required />
              <p className="text-xs text-muted-foreground">This field is required</p>
            </div>

            {/* Disabled Input */}
            <div className="space-y-2">
              <Label htmlFor="disabled-input">Disabled Input</Label>
              <Input id="disabled-input" placeholder="You can't edit this" disabled />
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="url-input">URL Input</Label>
              <Input 
                id="url-input" 
                type="url" 
                placeholder="https://example.com" 
              />
              <p className="text-xs text-muted-foreground">Enter a valid URL</p>
            </div>

            {/* URL Input with Button - Similar to the podcast submission form */}
            <div className="space-y-2">
              <Label htmlFor="podcast-url">Podcast URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="podcast-url" 
                  type="url" 
                  placeholder="Paste a Spotify or YouTube URL" 
                />
                <Button>Summarize</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started with shadcn/ui</CardTitle>
            <CardDescription>
              How to add more components to your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              We've manually added several components to our project. 
              To add more components, create their corresponding files in the 
              <code className="bg-gray-100 px-1 rounded">src/components/ui</code> directory.
            </p>
            <p>
              Check out the{" "}
              <a 
                href="https://ui.shadcn.com/docs/components"
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline"
              >
                shadcn/ui documentation
              </a>{" "}
              for more components you can add.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 