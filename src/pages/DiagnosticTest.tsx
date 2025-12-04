import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function DiagnosticTest() {
  const [results, setResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (message: string) => {
    setResults((prev) => [...prev, message]);
  };

  async function runDiagnostics() {
    setTesting(true);
    setResults([]);

    try {
      // Test 1: Check environment variables
      addResult('=== Environment Check ===');
      addResult(`Project ID: ${projectId}`);
      addResult(`Public Key exists: ${publicAnonKey ? 'Yes' : 'No'}`);
      addResult('');

      // Test 2: Check server health
      addResult('=== Server Health Check ===');
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-088c2cd9/health`;
      addResult(`Testing: ${healthUrl}`);
      
      try {
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        addResult(`Status: ${healthResponse.status} ${healthResponse.statusText}`);
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          addResult(`✓ Server is running`);
          addResult(`Timestamp: ${healthData.timestamp}`);
        } else {
          const errorText = await healthResponse.text();
          addResult(`✗ Server returned error: ${errorText}`);
        }
      } catch (error: any) {
        addResult(`✗ Health check failed: ${error.message}`);
      }
      addResult('');

      // Test 3: Test signup endpoint
      addResult('=== Signup Endpoint Test ===');
      const signupUrl = `https://${projectId}.supabase.co/functions/v1/make-server-088c2cd9/auth/signup`;
      addResult(`Testing: ${signupUrl}`);
      
      const testEmail = `test_${Date.now()}@shopeasy.com`;
      const testData = {
        email: testEmail,
        password: 'test123456',
        name: 'Test User',
        orgName: 'Test Org',
      };
      
      addResult(`Request data: ${JSON.stringify(testData, null, 2)}`);
      
      try {
        const signupResponse = await fetch(signupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(testData),
        });
        
        addResult(`Status: ${signupResponse.status} ${signupResponse.statusText}`);
        
        const responseText = await signupResponse.text();
        addResult(`Response: ${responseText}`);
        
        if (signupResponse.ok) {
          addResult(`✓ Signup endpoint is working`);
        } else {
          addResult(`✗ Signup failed`);
        }
      } catch (error: any) {
        addResult(`✗ Signup request failed: ${error.message}`);
      }
      
    } catch (error: any) {
      addResult(`✗ Diagnostic error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-4xl mx-auto p-6">
        <h1 className="mb-4">shopeasy Diagnostic Test</h1>
        <p className="text-muted-foreground mb-6">
          This page tests the backend connectivity and endpoints
        </p>

        <Button 
          onClick={runDiagnostics} 
          disabled={testing}
          className="mb-6"
        >
          {testing ? 'Running Tests...' : 'Run Diagnostics'}
        </Button>

        {results.length > 0 && (
          <div className="bg-muted rounded-lg p-4 font-mono text-sm max-h-[600px] overflow-auto">
            {results.map((line, index) => (
              <div 
                key={index}
                className={
                  line.startsWith('✓') ? 'text-green-600' :
                  line.startsWith('✗') ? 'text-red-600' :
                  line.startsWith('===') ? 'font-bold mt-2' :
                  'text-foreground'
                }
              >
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
