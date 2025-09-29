// Data export script to grab existing content from Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables directly from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
let supabaseUrl, supabaseAnonKey

try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')

  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1]
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1]
    }
  })
} catch (error) {
  console.error('Error reading .env.local:', error)
  process.exit(1)
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function exportData() {
  console.log('🔄 Exporting data from Supabase...')

  try {
    // Export listings with images
    console.log('📋 Fetching listings...')
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        *,
        listing_images (
          id,
          image_url,
          is_primary,
          caption
        )
      `)
      .order('created_at', { ascending: false })

    if (listingsError) {
      console.error('Error fetching listings:', listingsError)
      return
    }

    // Export conversations with messages
    console.log('💬 Fetching conversations...')
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        *,
        listings!inner (
          title,
          location
        ),
        messages (
          id,
          sender_id,
          content,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError)
    }

    // Create mock data structure
    const mockData = {
      listings: listings || [],
      conversations: conversations || [],
      users: [
        { id: 'demo-user-1', name: 'Demo User 1', email: 'demo1@example.com' },
        { id: 'demo-user-2', name: 'Demo User 2', email: 'demo2@example.com' },
        { id: 'demo-user-3', name: 'Demo User 3', email: 'demo3@example.com' }
      ],
      currentUser: { id: 'demo-user-1', name: 'Demo User 1', email: 'demo1@example.com' }
    }

    // Write to demo project
    const demoLibDir = path.join(__dirname, '..', '..', 'artist-rentals-demo', 'src', 'lib')
    if (!fs.existsSync(demoLibDir)) {
      fs.mkdirSync(demoLibDir, { recursive: true })
    }

    const outputPath = path.join(demoLibDir, 'mockData.json')
    fs.writeFileSync(outputPath, JSON.stringify(mockData, null, 2))

    console.log('✅ Data exported successfully!')
    console.log(`📁 Written to: ${outputPath}`)
    console.log(`📊 Exported: ${listings?.length || 0} listings, ${conversations?.length || 0} conversations`)

  } catch (error) {
    console.error('❌ Export failed:', error)
  }
}

exportData()