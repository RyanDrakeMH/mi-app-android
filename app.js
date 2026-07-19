document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const dropOverlay = document.getElementById('dropOverlay');
    const fileInput = document.getElementById('fileInput');
    const fileTabsContainer = document.getElementById('fileTabsContainer');
    
    const emptyState = document.getElementById('emptyState');
    const appInterface = document.getElementById('appInterface');
    
    const translationScrollArea = document.getElementById('translationScrollArea');
    const translationList = document.getElementById('translationList');
    
    const searchInput = document.getElementById('searchInput');
    const filterNav = document.getElementById('filterNav');
    
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const statsDisplay = document.getElementById('statsDisplay');
    
    const countAll = document.getElementById('countAll');
    const countTranslated = document.getElementById('countTranslated');
    const countPending = document.getElementById('countPending');
    
    const downloadBtn = document.getElementById('downloadBtn');
    const sidebarExportAllBtn = document.getElementById('sidebarExportAllBtn');
    const sidebarFileCount = document.getElementById('sidebarFileCount');
    
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');

    // --- Font Size Logic ---
    function updateFontSize(size) {
        document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
        fontSizeDisplay.textContent = `${size}px`;
    }
    
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (e) => {
            updateFontSize(e.target.value);
        });
        // Initial setup
        updateFontSize(fontSizeSlider.value);
    }

    // --- State ---
    let loadedFiles = []; // { name, fileObj, fileLines, blocks }
    let activeFileIndex = -1;
    let renderAnimationFrame = null; 
    let currentFilter = 'all'; // all, translated, pending
    let currentSearch = '';

    // --- Drag and Drop Logic ---
    let dragCounter = 0;
    
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        dropOverlay.classList.remove('hidden');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dropOverlay.classList.add('hidden');
        }
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.add('hidden');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
        e.target.value = '';
    });

    // --- File Processing ---
    async function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.name.endsWith('.rpy')) continue;
            
            if (loadedFiles.some(f => f.name === file.name)) continue;

            const text = await readFileAsync(file);
            const { fileLines, blocks } = parseRpy(text);
            
            loadedFiles.push({
                name: file.name,
                fileObj: file,
                fileLines: fileLines,
                blocks: blocks
            });
        }
        
        updateSidebarCounters();
        
        if (activeFileIndex === -1 && loadedFiles.length > 0) {
            selectFile(0);
        } else {
            renderTabs();
        }
    }

    function readFileAsync(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(file);
        });
    }

    function parseRpy(text) {
        const fileLines = text.split(/\r?\n/);
        const blocks = [];
        let currentBlock = null;

        for (let i = 0; i < fileLines.length; i++) {
            const line = fileLines[i];
            const trimmed = line.trim();

            if (trimmed.startsWith('#') && trimmed.includes('"')) {
                const firstQuote = line.indexOf('"');
                const lastQuote = line.lastIndexOf('"');
                if (firstQuote !== -1 && lastQuote !== -1 && firstQuote !== lastQuote) {
                    const prefix = line.substring(0, firstQuote);
                    const charMatch = prefix.replace('#', '').trim();
                    
                    currentBlock = {
                        originalLineIndex: i,
                        prefix: prefix,
                        character: charMatch,
                        originalText: line.substring(firstQuote + 1, lastQuote),
                        translatedLineIndex: -1,
                        translatedText: '',
                        translatedPrefix: ''
                    };
                }
            } 
            else if (trimmed !== '' && currentBlock && currentBlock.translatedLineIndex === -1 && trimmed.includes('"')) {
                const firstQuote = line.indexOf('"');
                const lastQuote = line.lastIndexOf('"');
                if (firstQuote !== -1 && lastQuote !== -1 && firstQuote !== lastQuote) {
                    currentBlock.translatedLineIndex = i;
                    currentBlock.translatedPrefix = line.substring(0, firstQuote);
                    currentBlock.translatedText = line.substring(firstQuote + 1, lastQuote);
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
            } 
            else if (trimmed !== '') {
                if (!trimmed.startsWith('translate')) {
                    currentBlock = null;
                }
            }
        }
        return { fileLines, blocks };
    }

    function updateSidebarCounters() {
        if (loadedFiles.length > 0) {
            sidebarFileCount.textContent = loadedFiles.length;
            sidebarFileCount.classList.remove('hidden');
        } else {
            sidebarFileCount.classList.add('hidden');
        }
    }

    // --- Tabs Rendering ---
    function renderTabs() {
        fileTabsContainer.innerHTML = '';
        
        loadedFiles.forEach((fileData, index) => {
            const isActive = index === activeFileIndex;
            
            const tabEl = document.createElement('div');
            if (isActive) {
                tabEl.className = 'flex items-center h-full px-4 bg-dark-bg-main border-r border-gray-800 border-t-2 border-t-accent-orange text-xs text-white cursor-pointer min-w-fit transition-colors';
            } else {
                tabEl.className = 'flex items-center h-full px-4 border-r border-gray-800 text-xs text-gray-400 hover:bg-gray-800/50 cursor-pointer min-w-fit transition-colors';
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'mr-2';
            nameSpan.textContent = fileData.name;
            tabEl.appendChild(nameSpan);
            
            // Close button (Optional feature, just visual for now or we can make it remove)
            const closeBtn = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            closeBtn.setAttribute('viewBox', '0 0 24 24');
            closeBtn.setAttribute('fill', 'none');
            closeBtn.setAttribute('stroke', 'currentColor');
            closeBtn.setAttribute('stroke-width', '2');
            closeBtn.setAttribute('class', 'w-3 h-3 text-gray-500 hover:text-white');
            closeBtn.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>';
            
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadedFiles.splice(index, 1);
                updateSidebarCounters();
                if (loadedFiles.length === 0) {
                    activeFileIndex = -1;
                    emptyState.classList.remove('hidden');
                    appInterface.classList.add('hidden');
                } else if (activeFileIndex === index) {
                    selectFile(Math.max(0, index - 1));
                } else {
                    if (activeFileIndex > index) activeFileIndex--;
                    renderTabs();
                }
            });
            
            tabEl.appendChild(closeBtn);
            
            tabEl.addEventListener('click', () => {
                selectFile(index);
            });
            
            fileTabsContainer.appendChild(tabEl);
        });

        // Add Button
        const addBtn = document.createElement('button');
        addBtn.className = 'flex items-center justify-center w-10 h-full text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors';
        addBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>';
        addBtn.addEventListener('click', () => fileInput.click());
        fileTabsContainer.appendChild(addBtn);
    }

    // --- Stats & Progress ---
    function updateStats() {
        if (activeFileIndex === -1) return;
        const blocks = loadedFiles[activeFileIndex].blocks;
        
        let translated = 0;
        let pending = 0;

        blocks.forEach(b => {
            if (b.translatedText.trim() === '') pending++;
            else translated++;
        });

        countAll.textContent = blocks.length;
        countTranslated.textContent = translated;
        countPending.textContent = pending;

        const percentage = blocks.length === 0 ? 0 : Math.round((translated / blocks.length) * 100);
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% Completado`;
    }

    // --- Filters & Search ---
    filterNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        // Reset styles
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.className = 'filter-btn px-4 bg-gray-700 text-white text-sm rounded-full font-medium hover:bg-gray-600 transition-colors whitespace-nowrap py-1.5';
        });
        
        // Active style
        btn.className = 'filter-btn px-4 py-1.5 bg-white text-black text-sm rounded-full font-semibold whitespace-nowrap transition-colors';
        
        currentFilter = btn.dataset.filter;
        renderActiveFile();
    });

    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderActiveFile();
    });

    function getFilteredBlocks(blocks) {
        return blocks.filter(b => {
            // Apply filter status
            if (currentFilter === 'translated' && b.translatedText.trim() === '') return false;
            if (currentFilter === 'pending' && b.translatedText.trim() !== '') return false;
            
            // Apply search
            if (currentSearch) {
                const searchStr = `${b.character || ''} ${b.originalText} ${b.translatedText}`.toLowerCase();
                if (!searchStr.includes(currentSearch)) return false;
            }
            
            return true;
        });
    }

    // --- Main Rendering ---
    function selectFile(index) {
        if (index < 0 || index >= loadedFiles.length) return;
        activeFileIndex = index;
        
        emptyState.classList.add('hidden');
        appInterface.classList.remove('hidden');
        downloadBtn.disabled = false;
        
        renderTabs();
        updateStats();
        renderActiveFile();
    }

    function renderActiveFile() {
        if (activeFileIndex === -1) return;
        const fileData = loadedFiles[activeFileIndex];
        const blocksToRender = getFilteredBlocks(fileData.blocks);
        
        statsDisplay.textContent = `Mostrando ${blocksToRender.length} bloques`;
        
        if (renderAnimationFrame) {
            clearTimeout(renderAnimationFrame);
        }

        translationList.innerHTML = '';
        const chunkSize = 50; // Smaller chunk for complex Tailwind nodes
        let currentIndex = 0;

        function renderChunk() {
            const fragment = document.createDocumentFragment();
            const end = Math.min(currentIndex + chunkSize, blocksToRender.length);

            for (let i = currentIndex; i < end; i++) {
                const block = blocksToRender[i];
                
                const section = document.createElement('section');
                section.className = 'bg-dark-bg-card border border-gray-800 p-4 relative rounded-[2rem] translation-block-card transition-colors hover:border-gray-600 focus-within:border-accent-orange cursor-text';
                
                section.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('original-text')) {
                        const ta = section.querySelector('textarea');
                        if (ta) ta.focus();
                    }
                });

                const spaceY = document.createElement('div');
                spaceY.className = 'space-y-2';

                const flexCol = document.createElement('div');
                flexCol.className = 'flex flex-col gap-1';

                // Original line container
                const origDiv = document.createElement('div');
                origDiv.className = 'flex items-center gap-2';
                
                if (block.character) {
                    const charSpan = document.createElement('span');
                    charSpan.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600/80 text-white uppercase tracking-wider shrink-0';
                    charSpan.textContent = block.character;
                    origDiv.appendChild(charSpan);
                }
                
                const textSpan = document.createElement('span');
                textSpan.className = 'text-gray-400 text-[1.05rem] original-text cursor-default select-none';
                textSpan.textContent = block.originalText;
                origDiv.appendChild(textSpan);
                
                flexCol.appendChild(origDiv);

                // Translation line container
                const transDiv = document.createElement('div');
                transDiv.className = 'pl-1 flex';
                
                const taContainer = document.createElement('div');
                taContainer.className = 'translated-text-container w-full';
                taContainer.dataset.replicatedValue = block.translatedText;
                
                const textarea = document.createElement('textarea');
                textarea.className = 'translated-textarea text-white/90 focus:ring-0 focus:outline-none';
                textarea.value = block.translatedText;
                textarea.placeholder = "Escribe aquí la traducción...";
                textarea.spellcheck = false;
                
                // Debounce the stats update
                let statsTimeout;
                textarea.addEventListener('input', () => {
                    taContainer.dataset.replicatedValue = textarea.value;
                    block.translatedText = textarea.value;
                    clearTimeout(statsTimeout);
                    statsTimeout = setTimeout(updateStats, 250);
                });
                
                taContainer.appendChild(textarea);
                transDiv.appendChild(taContainer);
                flexCol.appendChild(transDiv);
                
                spaceY.appendChild(flexCol);
                section.appendChild(spaceY);
                
                fragment.appendChild(section);
            }

            translationList.appendChild(fragment);
            currentIndex = end;

            if (currentIndex < blocksToRender.length) {
                // Use setTimeout instead of requestAnimationFrame to prevent blocking the paint frame
                // This ensures scrolling remains perfectly fluid while chunks load in the background
                renderAnimationFrame = setTimeout(renderChunk, 0);
            }
        }

        renderAnimationFrame = setTimeout(renderChunk, 0);
    }

    // --- Export Logic ---
    function exportFile(fileData) {
        const newLines = [...fileData.fileLines];
        fileData.blocks.forEach(block => {
            if (block.translatedLineIndex !== -1) {
                newLines[block.translatedLineIndex] = block.translatedPrefix + '"' + block.translatedText + '"';
            }
        });

        const newText = newLines.join('\r\n');
        const blob = new Blob([newText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileData.name; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadBtn.addEventListener('click', () => {
        if (activeFileIndex !== -1) {
            exportFile(loadedFiles[activeFileIndex]);
        }
    });

    sidebarExportAllBtn.addEventListener('click', () => {
        if (loadedFiles.length === 0) {
            alert('No hay archivos abiertos para exportar.');
            return;
        }
        loadedFiles.forEach(fileData => {
            exportFile(fileData);
        });
    });
});
