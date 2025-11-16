
import React, { useState, useCallback } from 'react';
import { TestFocus, DetailLevel } from './types';
import type { FormState } from './types';
import { generateTestCases } from './services/geminiService';

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3L9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
    </svg>
);

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
);

const LoaderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);


const parseMarkdownTable = (markdown: string): { headers: string[]; rows:string[][] } | null => {
    const lines = markdown.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return null; 

    const headerLine = lines[0];
    const separatorLine = lines[1];
    const rowLines = lines.slice(2);
    
    if (!separatorLine.includes('---') || !separatorLine.includes('|')) {
        return null;
    }

    const parseRow = (rowString: string) => rowString
        .split('|')
        .map(cell => cell.trim())
        .slice(1, -1);

    const headers = parseRow(headerLine);
    const rows = rowLines.map(parseRow);

    if (headers.length === 0 || rows.some(row => row.length !== headers.length)) {
        console.warn("Markdown table parse error: Header and row length mismatch.");
        return null;
    }

    return { headers, rows };
};

const TestCaseTable: React.FC<{ headers: string[], rows: string[][] }> = ({ headers, rows }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-700 shadow-md">
        <table className="min-w-full divide-y divide-gray-700 table-auto">
            <thead className="bg-gray-800">
                <tr>
                    {headers.map((header, index) => (
                        <th key={index} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-gray-900/50 divide-y divide-gray-700">
                {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-800/50 transition-colors">
                        {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-4 text-sm text-gray-400 align-top">
                                <div dangerouslySetInnerHTML={{ __html: cell }} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const CodeBlock: React.FC<{ content: string }> = ({ content }) => {
    const isJava = content.trim().startsWith('```java');
    const code = isJava ? content.trim().slice(7, -3).trim() : content;

    return (
        <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto whitespace-pre-wrap text-sm text-gray-300">
            <code>{code}</code>
        </pre>
    );
};

interface OutputSectionProps {
    title: string;
    content: string;
    parsedTable: { headers: string[]; rows: string[][] } | null;
}

const OutputSection: React.FC<OutputSectionProps> = ({ title, content, parsedTable }) => {
    const handleDownload = (filename: string, text: string, mimeType: string) => {
        const element = document.createElement("a");
        const file = new Blob([text], { type: mimeType });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleExportFeature = () => {
        const match = content.match(/Feature:\s*(.*)/);
        const featureName = match ? match[1].trim().toLowerCase().replace(/\s+/g, '-') : 'feature';
        handleDownload(`${featureName}.feature`, content, 'text/plain;charset=utf-8');
    };

    const handleExportJava = () => {
        const code = content.trim().startsWith('```java') ? content.trim().slice(7, -3).trim() : content;
        const match = code.match(/public class\s+(\w+)/);
        const className = match ? match[1].trim() : 'Steps';
        handleDownload(`${className}.java`, code, 'text/x-java-source;charset=utf-8');
    };

    const handleExportCsv = () => {
        if (!parsedTable) return;
        const { headers, rows } = parsedTable;

        const getColumnIndex = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        
        const idIndex = getColumnIndex('id');
        const titleIndex = getColumnIndex('title');
        const typeIndex = getColumnIndex('type');
        const riskIndex = getColumnIndex('risk');
        const tagsIndex = getColumnIndex('tags');
        const preconditionsIndex = getColumnIndex('preconditions');
        const stepsIndex = getColumnIndex('steps');
        const expectedResultIndex = getColumnIndex('expected result');

        const mapPriority = (risk: string) => {
            switch (risk.toLowerCase()) {
                case 'high': return '1-Critical';
                case 'medium': return '2-High';
                case 'low': return '3-Medium';
                default: return '4-Low';
            }
        };

        const csvHeaders = ['Title', 'Type', 'Priority', 'Preconditions', 'Steps', 'Expected Result', 'Tags', 'ID'];
        const csvRows = rows.map(row => {
            const steps = (row[stepsIndex] || '').replace(/<br\s*\/?>/gi, '\n');
            const preconditions = (row[preconditionsIndex] || '').replace(/<br\s*\/?>/gi, '\n');
            const expectedResult = (row[expectedResultIndex] || '').replace(/<br\s*\/?>/gi, '\n');

            return [
                row[titleIndex],
                row[typeIndex],
                mapPriority(row[riskIndex]),
                preconditions,
                steps,
                expectedResult,
                row[tagsIndex],
                row[idIndex]
            ].map(field => `"${(field || '').replace(/"/g, '""')}"`);
        });
        
        const csvContent = [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n');
        handleDownload('testrail-import.csv', csvContent, 'text/csv;charset=utf-8');
    };

    const titleLower = title.toLowerCase();
    let exportButton = null;

    if (titleLower.includes('test case list') && parsedTable) {
        exportButton = (
            <button onClick={handleExportCsv} title="Export for TestRail" className="flex items-center text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded-md transition">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export CSV
            </button>
        );
    } else if (titleLower.includes('cucumber feature skeleton')) {
        exportButton = (
            <button onClick={handleExportFeature} title="Download .feature file" className="flex items-center text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded-md transition">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download .feature
            </button>
        );
    } else if (titleLower.includes('step definition skeleton')) {
        exportButton = (
            <button onClick={handleExportJava} title="Download .java file" className="flex items-center text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded-md transition">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download .java
            </button>
        );
    }

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h2 className="text-2xl font-bold text-indigo-400">{title}</h2>
                {exportButton}
            </div>
            {parsedTable ? (
                <TestCaseTable headers={parsedTable.headers} rows={parsedTable.rows} />
            ) : title.toLowerCase().includes('skeleton') ? (
                <CodeBlock content={content} />
            ) : (
                <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300" dangerouslySetInnerHTML={{ __html: content }} />
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [formState, setFormState] = useState<FormState>({
        userStory: 'As a registered user, I want to log in with my email and password so that I can access my account dashboard.\nAC:\n– Valid credentials → redirect to dashboard and show user name\n– Invalid password → show inline error and stay on login page',
        systemUrl: 'https://www.example-app.com',
        testFocus: TestFocus.UI_E2E,
        detailLevel: DetailLevel.Medium,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [output, setOutput] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState('');

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({
            ...prevState,
            [name]: value,
        }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setOutput(null);
        setError(null);
        setCopySuccess('');

        try {
            const result = await generateTestCases(formState);
            setOutput(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopyToClipboard = useCallback(() => {
        if (!output) return;
        navigator.clipboard.writeText(output).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Failed to copy');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    }, [output]);

    const renderOutput = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <LoaderIcon className="animate-spin h-12 w-12 mb-4" />
                    <p className="text-lg">Generating test cases...</p>
                    <p className="text-sm">This may take a moment.</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-red-400 bg-red-900/20 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">Generation Failed</h3>
                    <p>{error}</p>
                </div>
            );
        }
        if (output) {
            const sections = output.split(/^#\s/m).filter(Boolean);
            return (
                <div>
                    {sections.map((section, index) => {
                        const firstNewLine = section.indexOf('\n');
                        const title = section.substring(0, firstNewLine).trim();
                        const content = section.substring(firstNewLine).trim();
                        const isTestCaseList = title.trim().toLowerCase() === 'test case list';
                        const parsedTable = isTestCaseList ? parseMarkdownTable(content) : null;
                        
                        return <OutputSection key={index} title={title} content={content} parsedTable={parsedTable} />;
                    })}
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <SparklesIcon className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-xl font-semibold">AI Test Designer</h3>
                <p className="mt-2 text-center">Your generated test cases will appear here.</p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200">
            <header className="bg-gray-900/70 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                         <SparklesIcon className="h-8 w-8 text-indigo-400" />
                         <h1 className="text-2xl font-bold tracking-tight text-white">AI Test Designer</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
                    {/* Input Column */}
                    <div className="lg:sticky lg:top-20 self-start">
                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <h2 className="text-lg font-semibold mb-4">Input Details</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="userStory" className="block text-sm font-medium text-gray-300 mb-1">User Story & Acceptance Criteria</label>
                                    <textarea
                                        id="userStory"
                                        name="userStory"
                                        rows={8}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                        value={formState.userStory}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="systemUrl" className="block text-sm font-medium text-gray-300 mb-1">System Under Test URL (Optional)</label>
                                    <input
                                        type="text"
                                        id="systemUrl"
                                        name="systemUrl"
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                        value={formState.systemUrl}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="testFocus" className="block text-sm font-medium text-gray-300 mb-1">Test Focus</label>
                                        <select
                                            id="testFocus"
                                            name="testFocus"
                                            className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                            value={formState.testFocus}
                                            onChange={handleInputChange}
                                        >
                                            {Object.values(TestFocus).map(focus => <option key={focus} value={focus}>{focus}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="detailLevel" className="block text-sm font-medium text-gray-300 mb-1">Detail Level</label>
                                        <select
                                            id="detailLevel"
                                            name="detailLevel"
                                            className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                            value={formState.detailLevel}
                                            onChange={handleInputChange}
                                        >
                                            {Object.values(DetailLevel).map(level => <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300"
                                >
                                    {isLoading ? <LoaderIcon className="animate-spin mr-2"/> : <SparklesIcon className="mr-2 h-5 w-5"/>}
                                    {isLoading ? 'Generating...' : 'Generate Test Cases'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Output Column */}
                    <div className="mt-8 lg:mt-0 bg-gray-800/50 p-6 rounded-xl border border-gray-700 min-h-[calc(100vh-12rem)]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Generated Output</h2>
                            {output && (
                                <button onClick={handleCopyToClipboard} className="flex items-center text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded-md transition">
                                    <ClipboardIcon className="mr-2 h-4 w-4" />
                                    {copySuccess || 'Copy All'}
                                </button>
                            )}
                        </div>
                        <div className="output-content">
                           {renderOutput()}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
