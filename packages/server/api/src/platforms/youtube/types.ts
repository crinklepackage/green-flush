export type YouTubeURLFormat = 
  | 'standard'    // watch?v=
  | 'shortened'   // youtu.be/
  | 'embed'       // embed/
  | 'shorts'      // shorts/
  | 'legacy'      // v/
  | 'screening'   // ytscreeningroom?v=

export interface VideoMetadata {
  title: string
  channel: string
  thumbnailUrl: string
  duration: number
}