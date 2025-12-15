const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

async function loginToTradingView({ username, password } = {}) {
  let driver;
  
  try {
    console.log('Starting TradingView Selenium login...');
    
    // Configure Chrome options
    const options = new chrome.Options();
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Optional: Run in headless mode (comment out to see browser)
    // options.addArguments('--headless');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    
    console.log('Chrome driver created successfully');
    
    // Navigate to TradingView login page
    await driver.get('https://www.tradingview.com/accounts/signin/');
    console.log('Navigated to TradingView login page');
    
    // Wait for page to load
    await driver.sleep(3000);
    
    // Find and fill username field
    console.log('Looking for username field...');
    const usernameField = await driver.wait(
      until.elementLocated(By.css('input[name="username"], input[type="email"], input[placeholder*="email"], input[placeholder*="user"]')),
      10000
    );
    const u = username || process.env.TV_USERNAME || process.env.TW_USERNAME || '';
    await usernameField.clear();
    await usernameField.sendKeys(u);
    console.log('Username entered');
    
    // Find and fill password field
    console.log('Looking for password field...');
    const passwordField = await driver.wait(
      until.elementLocated(By.css('input[name="password"], input[type="password"]')),
      10000
    );
    const p = password || process.env.TV_PASSWORD || process.env.TW_PASSWORD || '';
    await passwordField.clear();
    await passwordField.sendKeys(p);
    console.log('Password entered');
    
    // Find and click login button
    console.log('Looking for login button...');
    const loginButton = await driver.wait(
      until.elementLocated(By.css('button[type="submit"], button:contains("Sign in"), button:contains("Login")')),
      10000
    );
    await loginButton.click();
    console.log('Login button clicked');
    
    // Wait for login to complete (may need captcha solving)
    console.log('Waiting for login to complete...');
    await driver.sleep(5000);
    
    // Check if we're logged in by looking for user menu or dashboard
    try {
      await driver.wait(
        until.elementLocated(By.css('[data-name="user-menu"], .tv-header__user-menu, .username-dropdown')),
        15000
      );
      console.log('Login appears successful - user menu found');
    } catch (error) {
      console.log('User menu not found immediately, checking current URL...');
      const currentUrl = await driver.getCurrentUrl();
      console.log('Current URL:', currentUrl);
      
      if (currentUrl.includes('signin') || currentUrl.includes('login')) {
        console.log('Still on login page - possible captcha or login issue');
        
        // Check for captcha
        try {
          const captchaElement = await driver.findElement(By.css('.g-recaptcha, .captcha, [data-captcha]'));
          console.log('Captcha detected - you may need to solve it manually');
          
          // Wait longer for manual captcha solving
          console.log('Waiting 30 seconds for potential manual captcha solving...');
          await driver.sleep(30000);
        } catch (captchaError) {
          console.log('No captcha element found');
        }
      }
    }
    
    // Extract cookies/session data
    console.log('Extracting session cookies...');
    
    // Get all cookies
    const cookies = await driver.manage().getCookies();
    console.log('Found cookies:', cookies.length);
    
    // Look for session cookies
    const sessionCookies = {};
    for (const cookie of cookies) {
      console.log(`Cookie: ${cookie.name} = ${cookie.value.substring(0, 20)}...`);
      
      if (cookie.name === 'tv_session' || cookie.name === 'sessionid' || cookie.name === 'tv_signature') {
        sessionCookies[cookie.name] = cookie.value;
      }
    }
    
    // Also try to get localStorage/sessionStorage data
    try {
      console.log('Checking localStorage...');
      const localStorageData = await driver.executeScript(`
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.includes('session') || key.includes('token') || key.includes('auth')) {
            data[key] = localStorage.getItem(key);
          }
        }
        return data;
      `);
      console.log('localStorage session data:', localStorageData);
      
      // Merge with cookies
      Object.assign(sessionCookies, localStorageData);
    } catch (storageError) {
      console.log('Could not access localStorage:', storageError.message);
    }
    
    // Save session data to file
    const sessionData = {
      cookies: sessionCookies,
      timestamp: new Date().toISOString(),
      url: await driver.getCurrentUrl()
    };
    
    fs.writeFileSync('tradingview-session.json', JSON.stringify(sessionData, null, 2));
    console.log('Session data saved to tradingview-session.json');
    
    // Test if we can access a data page
    console.log('Testing access to data page...');
    await driver.get('https://www.tradingview.com/symbols/MCX-CRUDEOIL1!/');
    await driver.sleep(3000);
    
    const pageTitle = await driver.getTitle();
    console.log('Data page title:', pageTitle);
    
    // Extract final session data
    const finalCookies = await driver.manage().getCookies();
    const finalSessionData = {
      tv_session: finalCookies.find(c => c.name === 'tv_session')?.value,
      sessionid: finalCookies.find(c => c.name === 'sessionid')?.value,
      tv_signature: finalCookies.find(c => c.name === 'tv_signature')?.value
    };
    
    console.log('Final session data extracted:');
    console.log('tv_session:', finalSessionData.tv_session?.substring(0, 20) + '...');
    console.log('sessionid:', finalSessionData.sessionid?.substring(0, 20) + '...');
    console.log('tv_signature:', finalSessionData.tv_signature?.substring(0, 20) + '...');
    
    return finalSessionData;
    
  } catch (error) {
    console.error('Selenium login failed:', error);
    throw error;
  } finally {
    if (driver) {
      console.log('Closing browser...');
      // Uncomment to close browser automatically
      // await driver.quit();
      console.log('Browser session kept open for manual verification');
  }
}
}

// Run the login function
if (require.main === module) {
  const argv = process.argv.slice(2);
  const argU = argv.find(a => a.startsWith('username='));
  const argP = argv.find(a => a.startsWith('password='));
  const username = argU ? argU.split('=').slice(1).join('=') : undefined;
  const password = argP ? argP.split('=').slice(1).join('=') : undefined;
  loginToTradingView({ username, password })
    .then(sessionData => {
      console.log('Login process completed successfully!');
      console.log('Session data:', sessionData);
      
      // Output in a format that can be used by our API
      console.log('\n=== API USAGE ===');
      console.log('Use this command to set the session:');
      console.log(`curl -X POST http://localhost:3001/api/tradingview/token \\\n   -H "Content-Type: application/json" \\\n   -d '{"token":"${sessionData.tv_session || sessionData.sessionid}","signature":"${sessionData.tv_signature || ''}"}'`);
    })
    .catch(error => {
      console.error('Login process failed:', error);
      process.exit(1);
    });
}

module.exports = { loginToTradingView };
