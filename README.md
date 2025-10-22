# Bassem Noghnogh Portfolio Website

A professional portfolio website featuring a unique neon aesthetic and 3D ASCII art background.

## Live Site

- **GitHub Pages**: [bnogh123.github.io](https://bnogh123.github.io)
- **Custom Domain**: [bassemnoghnogh.com](https://bassemnoghnogh.com)

## Features

- **Neon Lamp Design**: Orange (#FF6B35) and green (#00FF88) color scheme with glowing effects
- **3D ASCII Background**: Interactive Three.js-powered background with virtual camera
- **Single-Page Design**: Smooth scrolling navigation between sections
- **Fully Responsive**: Works on desktop, tablet, and mobile devices
- **Project Showcase**: Display of completed and upcoming projects
- **Interactive Elements**: Smooth animations, hover effects, and scroll-triggered transitions

## Sections

1. **Hero**: Eye-catching introduction with glitch effect and CTA buttons
2. **About**: Personal bio, education, and background
3. **Skills**: Technical skills organized by category
4. **Projects**: Portfolio of completed and upcoming projects
5. **Interests**: Personal interests and hobbies
6. **Contact**: Contact information and resume download

## Technologies Used

- HTML5
- CSS3 (Custom animations, flexbox, grid)
- JavaScript (ES6+)
- Three.js (3D graphics)
- Google Fonts (VT323, Share Tech Mono)

## Project Structure

```
website/
├── index.html              # Main HTML file
├── styles.css              # Neon-themed styling
├── script.js               # Smooth scrolling & interactions
├── ascii-background.js     # Three.js 3D background
├── CNAME                   # Custom domain configuration
├── assets/
│   └── Bassem_Noghnogh_Resume.pdf
└── README.md
```

## Custom Domain Setup

To connect your custom domain (bassemnoghnogh.com) to GitHub Pages:

### 1. GitHub Pages Configuration
- Already configured via CNAME file in repository
- GitHub Pages is enabled on the `main` branch

### 2. Squarespace/DNS Configuration

Add the following DNS records in your domain provider (Squarespace):

**A Records** (for apex domain):
```
Type: A
Host: @
Points to: 185.199.108.153
```
```
Type: A
Host: @
Points to: 185.199.109.153
```
```
Type: A
Host: @
Points to: 185.199.110.153
```
```
Type: A
Host: @
Points to: 185.199.111.153
```

**CNAME Record** (for www subdomain):
```
Type: CNAME
Host: www
Points to: bnogh123.github.io
```

### 3. Wait for DNS Propagation
DNS changes can take 24-48 hours to fully propagate. You can check the status using:
```
nslookup bassemnoghnogh.com
```

### 4. Enable HTTPS
Once the domain is verified:
1. Go to your GitHub repository Settings
2. Navigate to Pages section
3. Check "Enforce HTTPS"

## Local Development

To run this website locally:

1. Clone the repository:
```bash
git clone https://github.com/bnogh123/bnogh123.github.io.git
cd bnogh123.github.io
```

2. Open `index.html` in your browser, or use a local server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (http-server)
npx http-server
```

3. Navigate to `http://localhost:8000`

## Customization

### Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --neon-orange: #FF6B35;
    --neon-green: #00FF88;
    --neon-pink: #FF10F0;
    --dark-bg: #0a0a0a;
}
```

### Projects
Add new projects in `index.html` under the Projects section:
```html
<div class="project-card">
    <div class="project-header">
        <h3>Project Name</h3>
        <span class="project-status live">Live</span>
    </div>
    <p class="project-tech">Tech Stack</p>
    <p class="project-description">Description</p>
    <div class="project-links">
        <a href="URL" class="project-link" target="_blank">GitHub →</a>
    </div>
</div>
```

### ASCII Background
Customize the 3D background in `ascii-background.js`:
- Adjust particle count
- Change colors
- Modify geometric shapes
- Alter animation speeds

## Easter Eggs

Try entering the Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A

## Performance

- Optimized Three.js rendering
- Lazy loading of animations
- Debounced scroll events
- Efficient CSS animations

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## License

MIT License - Feel free to use this as a template for your own portfolio!

## Contact

- **Email**: bassemnoghnogh11@gmail.com
- **LinkedIn**: [linkedin.com/in/bassemnoghnogh](https://linkedin.com/in/bassemnoghnogh)
- **GitHub**: [github.com/bnogh123](https://github.com/bnogh123)

---

Built with ❤️ using HTML, CSS, JavaScript & Three.js
