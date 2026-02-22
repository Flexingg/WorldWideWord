# Cloudflare R2 Setup Guide for WordWideWeb Audio

This guide walks you through setting up Cloudflare R2 to host your Bible audio files.

## Prerequisites

- A Cloudflare account (free)
- Your audio files generated locally (in the `audio/` folder)
- Access to your GitHub repository settings

## Step 1: Create a Cloudflare Account

1. Go to [Cloudflare](https://dash.cloudflare.com/sign-up)
2. Sign up for a free account
3. Verify your email address

## Step 2: Enable R2

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. In the left sidebar, click **R2 Object Storage**
3. If prompted, click **Purchase R2** (it's free - you just need to enable it)
4. Accept the terms and conditions

## Step 3: Create an R2 Bucket

1. In the R2 dashboard, click **Create bucket**
2. Name your bucket: `wordwideweb-audio` (or your preferred name)
3. Choose a location close to your users (Auto is fine)
4. Click **Create bucket**

## Step 4: Configure Public Access

### Option A: Custom Domain (Recommended)

1. In your bucket, go to **Settings** tab
2. Scroll to **Domain Access**
3. Click **Connect Domain**
4. Enter your domain: `audio.wordwideweb.com` (or a subdomain of your choice)
5. Cloudflare will automatically configure DNS

### Option B: Public R2.dev URL

1. In your bucket, go to **Settings** tab
2. Scroll to **Public Access**
3. Click **Allow Access**
4. You'll get a URL like: `https://pub-abc123def456.r2.dev`

## Step 5: Configure CORS

1. In your bucket, go to **Settings** tab
2. Scroll to **CORS Policy**
3. Click **Add CORS policy**
4. Paste this configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Click **Save**

> **Note**: Using `"*"` for AllowedOrigins allows access from any domain. For production, you may want to restrict this to your specific domains:
> ```json
> {
>   "AllowedOrigins": [
>     "https://yourusername.github.io",
>     "https://yourusername.github.io"
>   ],
>   "AllowedMethods": ["GET", "HEAD"],
>   "AllowedHeaders": ["*"],
>   "MaxAgeSeconds": 3600
> }
> ```

> **Important**: R2 does not support wildcard patterns like `http://localhost:*`. Use `*` for development or specify exact ports:
> ```json
> {
>   "AllowedOrigins": [
>     "http://localhost:5500",
>     "http://localhost:3000",
>     "http://127.0.0.1:5500"
>   ]
> }
> ```

## Step 6: Upload Your Audio Files

### Option A: Using the Cloudflare Dashboard (Small batches)

1. In your bucket, click **Upload**
2. Select all your MP3 files
3. Wait for upload to complete

### Option B: Using rclone (Recommended for bulk upload)

1. Install rclone:
   ```bash
   # Windows (using Chocolatey)
   choco install rclone
   
   # macOS
   brew install rclone
   
   # Linux
   curl https://rclone.org/install.sh | sudo bash
   ```

2. Configure rclone for R2:
   ```bash
   rclone config
   ```
   
   Follow the prompts:
   - Enter `n` for new remote
   - Name: `r2`
   - Storage type: Enter the number for "Cloudflare R2"
   - Access Key ID: Get from Cloudflare Dashboard → R2 → Manage R2 API Tokens
   - Secret Access Key: Same location
   - Region: `auto`
   - Endpoint: Leave blank for auto

3. Create API Token in Cloudflare:
   - Go to **R2** → **Manage R2 API Tokens**
   - Click **Create API token**
   - Permissions: **Object Read & Write**
   - Specify bucket: `wordwideweb-audio`
   - Click **Create API token**
   - Copy the Access Key ID and Secret Access Key

4. Upload your files:
   ```bash
   # Sync local audio folder to R2
   rclone sync ./audio r2:wordwideweb-audio --progress
   
   # Or copy (keeps files in destination that don't exist locally)
   rclone copy ./audio r2:wordwideweb-audio --progress
   ```

### Option C: Using wrangler (Cloudflare CLI)

1. Install wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Upload files:
   ```bash
   # Upload a single file
   wrangler r2 object put wordwideweb-audio/Genesis_1.mp3 --file=audio/Genesis_1.mp3
   
   # For bulk upload, use a script:
   for file in audio/*.mp3; do
     filename=$(basename "$file")
     echo "Uploading $filename..."
     wrangler r2 object put "wordwideweb-audio/$filename" --file="$file"
   done
   ```

## Step 7: Update Your Application Code

1. Open `js/config.js`
2. Find the `productionUrl` setting in the `audio` section
3. Update it with your R2 public URL:

```javascript
audio: {
    // ============================================================
    // PRODUCTION AUDIO URL - UPDATE THIS WITH YOUR R2 URL
    // ============================================================
    productionUrl: 'https://audio.wordwideweb.com',  // Your R2 URL here
    // ...
}
```

**Options for the URL:**
- Custom domain: `'https://audio.wordwideweb.com'`
- R2 public bucket: `'https://pub-abc123def456.r2.dev'`
- Set to `null` to use local audio folder

## Step 8: Verify Everything Works

1. Deploy your changes to GitHub Pages
2. Open your site in a browser
3. Navigate to a chapter and click the audio button
4. Verify the audio plays correctly

## Step 9: Remove Audio Files from Git

After confirming R2 works:

```bash
# Remove audio files from Git tracking (but keep locally)
git rm --cached audio/*.mp3

# Commit the change
git commit -m "Move audio hosting to Cloudflare R2"

# Push to GitHub
git push
```

## Cost Monitoring

1. Go to Cloudflare Dashboard → R2
2. Check your usage in the **Usage** tab
3. Set up billing alerts if needed

### Expected Costs

| Usage | Monthly Cost |
|-------|-------------|
| 5GB storage | $0 (within 10GB free tier) |
| 50GB bandwidth | $0 (no egress fees!) |
| 1M requests | $0 (within free tier) |

## Troubleshooting

### Audio doesn't play

1. **Check CORS**: Make sure your GitHub Pages URL is in the allowed origins
2. **Check URL**: Verify the audio URL in browser dev tools
3. **Check file names**: Ensure files match the expected pattern `{Book}_{Chapter}.mp3`

### Upload fails

1. **Check API token**: Ensure it has write permissions
2. **Check bucket name**: Must match exactly
3. **Check file sizes**: Individual files have a 5TB limit (not an issue for audio)

### Slow uploads

1. **Use rclone**: It's optimized for bulk transfers
2. **Check your internet**: Upload speed matters for 5GB
3. **Split uploads**: Upload in batches if needed

## Automation (Optional)

### GitHub Actions for Auto-Upload

Create `.github/workflows/upload-audio.yml`:

```yaml
name: Upload Audio to R2

on:
  push:
    branches: [main]
    paths:
      - 'audio/*.mp3'

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install rclone
        run: curl https://rclone.org/install.sh | sudo bash
      
      - name: Configure rclone
        env:
          R2_ACCESS_KEY: ${{ secrets.R2_ACCESS_KEY }}
          R2_SECRET_KEY: ${{ secrets.R2_SECRET_KEY }}
        run: |
          rclone config create r2 s3 \
            provider Cloudflare \
            access_key_id $R2_ACCESS_KEY \
            secret_access_key $R2_SECRET_KEY \
            endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com
      
      - name: Sync audio to R2
        run: rclone sync ./audio r2:wordwideweb-audio --progress
```

Add your R2 credentials as GitHub secrets:
1. Go to your repo → Settings → Secrets and variables → Actions
2. Add `R2_ACCESS_KEY` and `R2_SECRET_KEY`

## Next Steps

1. Set up the R2 bucket following this guide
2. Upload your audio files
3. Update the code with your R2 URL
4. Test thoroughly
5. Remove audio files from Git

## Support

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [rclone Documentation](https://rclone.org/)
- [Cloudflare Community](https://community.cloudflare.com/)
