import ChatWidget from '@/components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
      {/* Header */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-16">
          <h1 className="text-5xl font-bold mb-6">
            Vanguard Investment Management
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Discover the power of low-cost investing and long-term wealth building with Vanguard&apos;s proven investment philosophy.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="text-orange-400 mb-4">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Low-Cost Investing</h3>
            <p className="text-white/80">
              Benefit from Vanguard&apos;s investor-owned structure that keeps costs low and returns value directly to you.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="text-orange-400 mb-4">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Diversification</h3>
            <p className="text-white/80">
              Build balanced portfolios across different asset classes to manage risk and support long-term growth.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="text-orange-400 mb-4">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Long-Term Discipline</h3>
            <p className="text-white/80">
              Stay focused on your goals with a disciplined approach that weathers market volatility.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Start Your Investment Journey?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Chat with our AI assistant to learn more about Vanguard&apos;s investment philosophy, 
              explore our funds, or get answers to your investment questions.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold transition-colors">
                Learn More
              </button>
              <button className="border border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-full font-semibold transition-colors">
                View Funds
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget 
        companyId="vanguard"
        companyName="Vanguard Assistant"
        primaryColor="#FF6B35"
        position="bottom-right"
        autoOpen={false}
        welcomeMessage="Hello! I&apos;m your Vanguard investment assistant. How can I help you with your investment questions today?"
        placeholderText="Ask about funds, fees, accounts, or investment strategies..."
      />
    </main>
  );
}
