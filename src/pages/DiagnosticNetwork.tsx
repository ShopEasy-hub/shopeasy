import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function DiagnosticNetwork() {
  const [results, setResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  async function runDiagnostics() {
    setTesting(true);
    const testResults: any = {};

    // Test 1: Check credentials
    testResults.credentials = {
      projectId: projectId ? 'Set' : 'Missing',
      publicAnonKey: publicAnonKey ? 'Set' : 'Missing',
      url: `https://${projectId}.supabase.co`,
    };

    // Test 2: Check Supabase connection
    try {
      const { data, error } = await supabase.from('organizations').select('count').limit(1);
      if (error) {
        testResults.supabaseConnection = `Error: ${error.message}`;
      } else {
        testResults.supabaseConnection = 'Connected';
      }
    } catch (error: any) {
      testResults.supabaseConnection = `Exception: ${error.message}`;
    }

    // Test 3: Check auth status
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        testResults.authSession = `Error: ${error.message}`;
      } else {
        testResults.authSession = data.session ? 'Logged in' : 'Not logged in';
      }
    } catch (error: any) {
      testResults.authSession = `Exception: ${error.message}`;
    }

    // Test 4: Check network connectivity to Supabase
    try {
      const response = await fetch(`https://${projectId}.supabase.co/rest/v1/`, {
        method: 'HEAD',
        headers: {
          apikey: publicAnonKey,
        },
      });
      testResults.networkConnectivity = response.ok 
        ? 'Network OK' 
        : `HTTP ${response.status}: ${response.statusText}`;
    } catch (error: any) {
      testResults.networkConnectivity = `NetworkError: ${error.message}`;
    }

    // Test 5: Check localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      testResults.localStorage = 'Working';
    } catch (error: any) {
      testResults.localStorage = `Error: ${error.message}`;
    }

    // Test 6: Check if in iframe
    testResults.inIframe = window.self !== window.top ? 'Running in iframe' : 'Not in iframe';

    // Test 7: Check CORS
    testResults.origin = window.location.origin;
    testResults.protocol = window.location.protocol;

    setResults(testResults);
    setTesting(false);
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <Card className="p-6">
        <h1 className="mb-6">Network Diagnostics</h1>
        
        <Button onClick={runDiagnostics} disabled={testing} className="mb-6">
          {testing ? 'Running Tests...' : 'Run Diagnostics'}
        </Button>

        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            <h2 className="mb-4">Test Results:</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 font-mono text-sm">
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="flex flex-col sm:flex-row gap-2">
                  <span className="font-semibold min-w-[200px]">{key}:</span>
                  <span className="break-all">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>

            {results.networkConnectivity?.includes('NetworkError') && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-red-800 mb-2">🚨 Network Error Detected</h3>
                <p className="text-sm text-red-700 mb-2">
                  The app cannot connect to Supabase. This could be caused by:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  <li>Browser extension blocking requests (ad blocker, privacy extension)</li>
                  <li>Corporate firewall or network restrictions</li>
                  <li>Supabase service is down (check status.supabase.com)</li>
                  <li>Invalid Supabase credentials in /utils/supabase/info.ts</li>
                  <li>CORS issue (check if you're on the correct domain)</li>
                </ul>
                <p className="mt-4 text-sm text-red-700">
                  <strong>Quick fix:</strong> Try disabling browser extensions or test in an incognito window.
                </p>
              </div>
            )}

            {results.localStorage?.includes('Error') && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-yellow-800 mb-2">⚠️ localStorage Issue</h3>
                <p className="text-sm text-yellow-700">
                  localStorage is not available. This will prevent login sessions from persisting.
                  Enable cookies and storage in your browser settings.
                </p>
              </div>
            )}

            {results.inIframe?.includes('iframe') && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-yellow-800 mb-2">⚠️ Running in iframe</h3>
                <p className="text-sm text-yellow-700">
                  The app is running inside an iframe. This may cause authentication issues.
                  Try opening the app in a new tab.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-blue-800 mb-2">💡 Common Solutions</h3>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li>Refresh the page (F5 or Cmd+R)</li>
            <li>Clear browser cache and cookies</li>
            <li>Try incognito/private browsing mode</li>
            <li>Disable browser extensions temporarily</li>
            <li>Check your internet connection</li>
            <li>Try a different browser</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}