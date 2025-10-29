"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, MapPin, MessageCircle, Star, Award } from 'lucide-react'

interface SkillCardProps {
  type: "offer" | "request"
  title: string
  description: string
  userName: string
  department: string
  userRating?: number
  category: string
  level?: string
  tags?: string[]
  urgency?: string
  availability?: string
  preferredLevel?: string
  createdAt: string
  onContact: () => void
}

export function SkillCard({
  type,
  title,
  description,
  userName,
  department,
  userRating = 0,
  category,
  level,
  tags,
  urgency,
  availability,
  preferredLevel,
  createdAt,
  onContact,
}: SkillCardProps) {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "High": return "destructive"
      case "Medium": return "default"
      case "Low": return "secondary"
      default: return "secondary"
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      "Programming": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "Design": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      "Academics": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "Soft Skills": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      "Languages": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      "Music": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      "Sports": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      "Other": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
    return colors[category as keyof typeof colors] || colors.Other
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "Expert": return "👑"
      case "Advanced": return "🏆"
      case "Intermediate": return "⭐"
      case "Beginner": return "🔰"
      default: return ""
    }
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge className={`text-xs ${getCategoryColor(category)}`}>
            {category}
          </Badge>
          {type === "request" && urgency && (
            <Badge variant={getUrgencyColor(urgency)} className="text-xs">
              {urgency}
            </Badge>
          )}
          {type === "offer" && level && (
            <Badge variant="outline" className="text-xs">
              {getLevelIcon(level)} {level}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
              {title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <span>{userName}</span>
              {userRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{userRating.toFixed(1)}</span>
                </div>
              )}
              <span>•</span>
              <MapPin className="h-3 w-3" />
              <span>{department}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {description}
        </p>

        {availability && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{availability}</span>
          </div>
        )}

        {preferredLevel && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="h-4 w-4" />
            <span>Prefers: {preferredLevel} level helpers</span>
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleDateString()}
          </span>
          <Button
            onClick={onContact}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {type === "offer" ? "Contact" : "Help"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
