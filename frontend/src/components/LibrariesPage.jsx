import { useState } from 'react';

const LibrariesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const tools = [
    {
      category: 'Brute Force & Cracking',
      logo: '🔨',
      tools: [
        {
          name: 'JWTTool',
          description: 'Comprehensive JWT security testing toolkit with brute-force capabilities, none algorithm checking, and key confusion attacks.',
          install: 'git clone https://github.com/ticarpi/jwt_tool.git',
          features: ['Brute-force secret keys', 'None algorithm check', 'Key confusion attacks', 'JWT manipulation'],
          github: 'https://github.com/ticarpi/jwt_tool',
          language: 'Python',
          type: 'Multi-purpose'
        },
        {
          name: 'jwt-cracker',
          description: 'Fast Node.js tool specifically designed for brute-forcing HMAC secrets in JWT tokens.',
          install: 'npm install -g jwt-cracker',
          features: ['HMAC secret brute-force', 'Dictionary attacks', 'Multi-threading'],
          github: 'https://github.com/lmammino/jwt-cracker',
          language: 'Node.js',
          type: 'Brute-force'
        },
        {
          name: 'CrackJWT',
          description: 'High-performance C-based HMAC secret brute-forcer optimized for speed and efficiency.',
          install: 'git clone https://github.com/brendan-rius/c-jwt-cracker.git && make',
          features: ['Fast C implementation', 'HMAC brute-force', 'Low resource usage'],
          github: 'https://github.com/brendan-rius/c-jwt-cracker',
          language: 'C',
          type: 'Brute-force'
        },
        {
          name: 'Hashcat',
          description: 'The world\'s most powerful and flexible password-cracking tool - the gold standard for serious hash cracking including JWT secrets.',
          install: 'git clone https://github.com/hashcat/hashcat.git',
          features: ['GPU acceleration', 'Multiple attack modes', 'Massive wordlist support', 'Rule-based attacks'],
          github: 'https://github.com/hashcat/hashcat',
          language: 'C/OpenCL',
          type: 'Advanced cracking'
        }
      ]
    },
    {
      category: 'Security Testing & Analysis',
      logo: '🔍',
      tools: [
        {
          name: 'JWT-Hack',
          description: 'Comprehensive testing tool for common JWT attacks including weak key detection and various JWT vulnerabilities.',
          install: 'git clone https://github.com/Bo0oM/jwt-hack.git',
          features: ['Common JWT attacks', 'Weak key guessing', 'Algorithm confusion', 'Signature bypass'],
          github: 'https://github.com/Bo0oM/jwt-hack',
          language: 'Python',
          type: 'Security testing'
        },
        {
          name: 'JAWS (JWT Analysis and Weak-key Scanner)',
          description: 'Automated scanner that detects weak keys and common JWT misconfigurations in applications.',
          install: 'git clone https://github.com/ksanch78/jaws.git',
          features: ['Automated weak key detection', 'Misconfiguration checks', 'Batch scanning', 'Report generation'],
          github: 'https://github.com/ksanch78/jaws',
          language: 'Python',
          type: 'Automated scanning'
        }
      ]
    }
  ];

  const filteredTools = tools.filter(category => {
    if (selectedCategory !== 'all' && category.category !== selectedCategory) {
      return false;
    }
    if (searchTerm) {
      return category.tools.some(tool => 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.features.some(feature => feature.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return true;
  });

  const categories = ['all', ...tools.map(cat => cat.category)];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tools for cracking Json Web Token
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            A comprehensive collection of penetration testing tools for JWT security assessment. 
            Find the right tools for brute-forcing secrets, testing vulnerabilities, and analyzing JWT implementations.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Tools Grid */}
        <div className="space-y-8">
          {filteredTools.map(category => (
            <div key={category.category} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Category Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{category.logo}</span>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {category.category}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {category.tools.length} tools
                  </span>
                </div>
              </div>

              {/* Tools List */}
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                  {category.tools.map(tool => (
                    <div key={tool.name} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:shadow-md transition-shadow">
                      {/* Tool Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                              {tool.name}
                            </h3>
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                              {tool.language}
                            </span>
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                              {tool.type}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                            {tool.description}
                          </p>
                        </div>
                        <a
                          href={tool.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                          </svg>
                        </a>
                      </div>

                      {/* Features */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Key Features:</p>
                        <div className="flex flex-wrap gap-2">
                          {tool.features.map(feature => (
                            <span key={feature} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Installation */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Installation:</p>
                        <code className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                          {tool.install}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Security Notice */}
        <div className="mt-12 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                ⚠️ Ethical Use Only
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm">
                These tools are intended for authorized penetration testing, security research, and educational purposes only. 
                Only use these tools on systems you own or have explicit written permission to test. 
                Unauthorized access to computer systems is illegal and unethical. Always follow responsible disclosure practices.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Getting Started
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                For beginners, start with JWTTool as it provides comprehensive functionality and good documentation. 
                For high-performance brute-forcing, consider CrackJWT or Hashcat. Always test tools in controlled environments first 
                and understand their capabilities before using them in professional assessments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibrariesPage;