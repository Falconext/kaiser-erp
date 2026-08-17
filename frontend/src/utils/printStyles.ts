type PrintDimensions = {
  width: number
  height: number
}

export const buildComprobantePrintPageStyle = ({ width, height }: PrintDimensions) => {
  const fontFamily = width <= 80 ? "'VT323', monospace" : "'Inter', Arial, sans-serif"

  return `
    @import url('https://fonts.googleapis.com/css2?family=VT323&family=Inter:wght@400;500;600;700;800&display=swap');
    @media print {
      @page { size: ${width}mm ${height}mm; margin: 0; background-color: #fff; }
      html, body {
        width: ${width}mm;
        min-height: ${height}mm;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body, #print-root, #print-root * {
        box-sizing: border-box;
        font-family: ${fontFamily} !important;
      }
      #print-root { color: #000; background: #fff; }
      #print-root .hidden { display: none !important; }
      #print-root .block { display: block !important; }
      #print-root .inline-block { display: inline-block !important; }
      #print-root .flex { display: flex !important; }
      #print-root .inline-flex { display: inline-flex !important; }
      #print-root .grid { display: grid !important; }
      #print-root .flex-col { flex-direction: column !important; }
      #print-root .flex-row { flex-direction: row !important; }
      #print-root .flex-1 { flex: 1 1 0% !important; }
      #print-root .shrink-0 { flex-shrink: 0 !important; }
      #print-root .items-start { align-items: flex-start !important; }
      #print-root .items-center { align-items: center !important; }
      #print-root .items-end { align-items: flex-end !important; }
      #print-root .justify-start { justify-content: flex-start !important; }
      #print-root .justify-center { justify-content: center !important; }
      #print-root .justify-between { justify-content: space-between !important; }
      #print-root .gap-1 { gap: 0.25rem !important; }
      #print-root .gap-2 { gap: 0.5rem !important; }
      #print-root .gap-3 { gap: 0.75rem !important; }
      #print-root .gap-4 { gap: 1rem !important; }
      #print-root .gap-8 { gap: 2rem !important; }
      #print-root .gap-x-8 { column-gap: 2rem !important; }
      #print-root .gap-y-1 { row-gap: 0.25rem !important; }
      #print-root .space-y-0\\.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.125rem !important; }
      #print-root .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem !important; }
      #print-root .w-full { width: 100% !important; }
      #print-root .w-1\\/2 { width: 50% !important; }
      #print-root .w-1\\/3 { width: 33.333333% !important; }
      #print-root .w-2\\/3 { width: 66.666667% !important; }
      #print-root .w-8 { width: 2rem !important; }
      #print-root .w-24 { width: 6rem !important; }
      #print-root .h-8 { height: 2rem !important; }
      #print-root .h-24 { height: 6rem !important; }
      #print-root .w-\\[8\\%\\] { width: 8% !important; }
      #print-root .w-\\[10\\%\\] { width: 10% !important; }
      #print-root .w-\\[70px\\] { width: 70px !important; }
      #print-root .w-\\[80px\\] { width: 80px !important; }
      #print-root .w-\\[100px\\] { width: 100px !important; }
      #print-root .w-\\[115px\\] { width: 115px !important; }
      #print-root .w-\\[130px\\] { width: 130px !important; }
      #print-root .w-\\[150px\\] { width: 150px !important; }
      #print-root .h-\\[150px\\] { height: 150px !important; }
      #print-root .max-w-full { max-width: 100% !important; }
      #print-root .basis-\\[16\\%\\] { flex-basis: 16% !important; }
      #print-root .basis-\\[20\\%\\] { flex-basis: 20% !important; }
      #print-root .basis-\\[44\\%\\] { flex-basis: 44% !important; }
      #print-root .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      #print-root .grid-cols-\\[70px_1fr\\] { grid-template-columns: 70px 1fr !important; }
      #print-root .grid-cols-\\[80px_1fr\\] { grid-template-columns: 80px 1fr !important; }
      #print-root .grid-cols-\\[110px_1fr\\] { grid-template-columns: 110px 1fr !important; }
      #print-root .grid-cols-\\[115px_1fr\\] { grid-template-columns: 115px 1fr !important; }
      #print-root .p-1 { padding: 0.25rem !important; }
      #print-root .p-2 { padding: 0.5rem !important; }
      #print-root .p-3 { padding: 0.75rem !important; }
      #print-root .p-5 { padding: 1.25rem !important; }
      #print-root .px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
      #print-root .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
      #print-root .px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
      #print-root .px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
      #print-root .px-5 { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
      #print-root .py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
      #print-root .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
      #print-root .pt-1 { padding-top: 0.25rem !important; }
      #print-root .pt-3 { padding-top: 0.75rem !important; }
      #print-root .pt-4 { padding-top: 1rem !important; }
      #print-root .pt-5 { padding-top: 1.25rem !important; }
      #print-root .pb-1 { padding-bottom: 0.25rem !important; }
      #print-root .pb-2 { padding-bottom: 0.5rem !important; }
      #print-root .pb-10 { padding-bottom: 2.5rem !important; }
      #print-root .m-0 { margin: 0 !important; }
      #print-root .mx-auto { margin-left: auto !important; margin-right: auto !important; }
      #print-root .my-1 { margin-top: 0.25rem !important; margin-bottom: 0.25rem !important; }
      #print-root .mt-0\\.5 { margin-top: 0.125rem !important; }
      #print-root .mt-1 { margin-top: 0.25rem !important; }
      #print-root .mt-2 { margin-top: 0.5rem !important; }
      #print-root .mt-3 { margin-top: 0.75rem !important; }
      #print-root .mt-4 { margin-top: 1rem !important; }
      #print-root .mt-8 { margin-top: 2rem !important; }
      #print-root .mb-1 { margin-bottom: 0.25rem !important; }
      #print-root .mb-2 { margin-bottom: 0.5rem !important; }
      #print-root .mb-3 { margin-bottom: 0.75rem !important; }
      #print-root .mb-4 { margin-bottom: 1rem !important; }
      #print-root .mb-8 { margin-bottom: 2rem !important; }
      #print-root .mb-10 { margin-bottom: 2.5rem !important; }
      #print-root .ml-4 { margin-left: 1rem !important; }
      #print-root .text-left { text-align: left !important; }
      #print-root .text-center { text-align: center !important; }
      #print-root .text-right { text-align: right !important; }
      #print-root .align-top { vertical-align: top !important; }
      #print-root .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
      #print-root .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
      #print-root .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
      #print-root .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
      #print-root .text-\\[9px\\] { font-size: 9px !important; }
      #print-root .text-\\[10px\\] { font-size: 10px !important; }
      #print-root .text-\\[12px\\] { font-size: 12px !important; }
      #print-root .text-\\[14px\\] { font-size: 14px !important; }
      #print-root .text-\\[15px\\] { font-size: 15px !important; }
      #print-root .text-\\[16px\\] { font-size: 16px !important; }
      #print-root .leading-none { line-height: 1 !important; }
      #print-root .leading-tight { line-height: 1.25 !important; }
      #print-root .leading-relaxed { line-height: 1.625 !important; }
      #print-root .font-normal { font-weight: 400 !important; }
      #print-root .font-medium { font-weight: 500 !important; }
      #print-root .font-semibold { font-weight: 600 !important; }
      #print-root .font-bold { font-weight: 700 !important; }
      #print-root .font-extrabold { font-weight: 800 !important; }
      #print-root .font-mono { font-family: ${fontFamily} !important; }
      #print-root .uppercase { text-transform: uppercase !important; }
      #print-root .italic { font-style: italic !important; }
      #print-root .break-words { overflow-wrap: break-word !important; }
      #print-root .break-all { word-break: break-all !important; }
      #print-root .whitespace-nowrap { white-space: nowrap !important; }
      #print-root .border { border-width: 1px !important; border-style: solid !important; }
      #print-root .border-t { border-top-width: 1px !important; border-top-style: solid !important; }
      #print-root .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
      #print-root .border-l { border-left-width: 1px !important; border-left-style: solid !important; }
      #print-root .border-r { border-right-width: 1px !important; border-right-style: solid !important; }
      #print-root .border-dashed { border-style: dashed !important; }
      #print-root .border-black { border-color: #000 !important; }
      #print-root .border-gray-300 { border-color: #d1d5db !important; }
      #print-root .border-gray-400 { border-color: #9ca3af !important; }
      #print-root .rounded-md { border-radius: 0.375rem !important; }
      #print-root .rounded-lg { border-radius: 0.5rem !important; }
      #print-root .bg-white { background-color: #fff !important; }
      #print-root .bg-gray-50 { background-color: #f9fafb !important; }
      #print-root .bg-gray-300 { background-color: #d1d5db !important; }
      #print-root .bg-\\[\\#fff\\] { background-color: #fff !important; }
      #print-root .text-black { color: #000 !important; }
      #print-root .text-gray-500 { color: #6b7280 !important; }
      #print-root .text-gray-600 { color: #4b5563 !important; }
      #print-root .text-gray-700 { color: #374151 !important; }
      #print-root .object-contain { object-fit: contain !important; }
      #print-root .object-cover { object-fit: cover !important; }
      #print-root .object-left { object-position: left !important; }
      #print-root table { width: 100%; border-collapse: collapse; }
      #print-root th, #print-root td { vertical-align: top; }
      #print-root img { max-width: 100%; }
    }
  `
}
