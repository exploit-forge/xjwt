import { useState, useEffect } from 'react';

const PromoNotification = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if notification was recently shown
    const lastShown = localStorage.getItem('exploitForgePromoLastShown');
    const now = Date.now();
    const fiveMinutes = 1 * 60 * 1000; // 1 minutes in milliseconds

    // Show notification if it hasn't been shown in the last 5 minutes
    if (!lastShown || (now - parseInt(lastShown)) > fiveMinutes) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
        localStorage.setItem('exploitForgePromoLastShown', now.toString());
      }, 60000); // Show after 60 seconds of page load

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Auto-hide after 10 seconds
      const autoHideTimer = setTimeout(() => {
        handleClose();
      }, 10000);

      return () => clearTimeout(autoHideTimer);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
    }, 300); // Wait for animation to complete
  };

  const handleContactClick = () => {
    window.open('https://exploit-forge.com/#contact', '_blank');
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm transition-all duration-300 ease-out ${
      isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-lg shadow-2xl border border-orange-400/30 overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500/10 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-200 rounded-full animate-pulse shadow-lg"></div>
            <span className="text-white font-bold text-sm drop-shadow-sm">Exploit-Forge LTD</span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-4 h-4 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm mb-2 drop-shadow-sm">
                Professional Penetration Testing
              </h4>
              <p className="text-gray-100 text-xs leading-relaxed mb-3 drop-shadow-sm">
              Looking to assess the security of your company's Web, API, or Mobile applications? Exploit-Forge offers industry-grade penetration testing services tailored to your business, all at a cost-effective rate.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleContactClick}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors duration-200 shadow-lg"
                >
                  Contact Us
                </button>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-200"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar for auto-hide */}
        <div className="h-1 bg-red-800">
          <div className="h-full bg-orange-400 animate-[shrink_10s_linear_forwards]"></div>
        </div>
      </div>
    </div>
  );
};

export default PromoNotification;
