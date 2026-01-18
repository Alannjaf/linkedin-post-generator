
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportCarouselToPDF = async (
    carouselTitle: string,
    totalSlides: number,
    onProgress?: (progress: number) => void
): Promise<void> => {
    const pdf = new jsPDF('p', 'px', [1080, 1350]); // Portrait 4:5 aspect ratio
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= totalSlides; i++) {
        const elementId = `slide-export-${i}`;
        const element = document.getElementById(elementId);

        if (!element) {
            console.error(`Slide element not found: ${elementId}`);
            continue;
        }

        if (onProgress) {
            onProgress((i / totalSlides) * 100);
        }

        try {
            // Small delay to ensure rendering matches
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(element, {
                scale: 2, // Higher scale for better quality
                useCORS: true, // For cross-origin images
                allowTaint: true,
                backgroundColor: '#1E1E1E', // Match the dark theme background
                logging: false,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            if (i > 1) {
                pdf.addPage([1080, 1350]);
            }

            pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
        } catch (error) {
            console.error(`Error processing slide ${i}:`, error);
        }
    }

    const safeTitle = carouselTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    pdf.save(`${safeTitle}_carousel.pdf`);
};
