/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LoginModal } from './components/LoginModal';
import { Header } from './components/Header';
import { OperationsView } from './components/OperationsView';
import { ManagementView } from './components/ManagementView';
import { AppsScriptModal } from './components/AppsScriptModal';
import { RecordDetailModal } from './components/RecordDetailModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { OtrRecord } from './types';
import { RAW_CSV_DATA } from './data/rawCsvData';
import {
  parseRawCsvToRecords,
  fetchFromAppsScript,
  saveStoredRecords,
  loadStoredRecords,
} from './services/dataService';

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('bailac_auth') === 'true';
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'operaciones' | 'gestion'>('operaciones');

  // TV display mode
  const [tvMode, setTvMode] = useState<boolean>(false);

  // Modals state
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<OtrRecord | null>(null);
  const [isCreateRecordModalOpen, setIsCreateRecordModalOpen] = useState<boolean>(false);

  // Custom Google Apps Script URL in localStorage
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem('bailac_apps_script_url') || '';
  });

  // Data state with persistent storage support
  const [records, setRecords] = useState<OtrRecord[]>(() => {
    try {
      const stored = loadStoredRecords();
      if (stored && stored.length > 0) {
        return stored;
      }
      const initial = parseRawCsvToRecords(RAW_CSV_DATA);
      saveStoredRecords(initial);
      return initial;
    } catch {
      return [];
    }
  });

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // 15-minute auto-refresh countdown (900 seconds)
  const AUTO_REFRESH_INTERVAL = 15 * 60;
  const [secondsUntilAutoRefresh, setSecondsUntilAutoRefresh] = useState<number>(AUTO_REFRESH_INTERVAL);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch or reload data function
  const loadData = useCallback(
    async (isAuto = false) => {
      setIsRefreshing(true);
      try {
        if (appsScriptUrl && appsScriptUrl.trim() !== '') {
          const liveRecords = await fetchFromAppsScript(appsScriptUrl.trim());
          setRecords(liveRecords);
          saveStoredRecords(liveRecords);
          setLastUpdated(new Date());
          addToast(
            'success',
            isAuto ? 'Auto-actualización completada' : 'Datos sincronizados con éxito',
            `Se actualizaron ${liveRecords.length} registros desde Google Sheets.`
          );
        } else {
          // Check local stored records first, fallback to CSV
          const currentStored = loadStoredRecords();
          const dataset = currentStored && currentStored.length > 0 ? currentStored : parseRawCsvToRecords(RAW_CSV_DATA);
          setRecords(dataset);
          setLastUpdated(new Date());
          addToast(
            'info',
            isAuto ? 'Auto-actualización de Planta' : 'Base de datos consolidada cargada',
            `Monitoreando ${dataset.length} neumáticos OTR en el sistema.`
          );
        }
      } catch (err: any) {
        addToast(
          'error',
          'Error al sincronizar datos',
          `Fallo de conexión: ${err.message}. Manteniendo última copia en memoria.`
        );
      } finally {
        setIsRefreshing(false);
        setSecondsUntilAutoRefresh(AUTO_REFRESH_INTERVAL);
      }
    },
    [appsScriptUrl, addToast]
  );

  // Auto-refresh countdown effect (every second)
  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setInterval(() => {
      setSecondsUntilAutoRefresh((prev) => {
        if (prev <= 1) {
          loadData(true);
          return AUTO_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, loadData]);

  // Initial load if a custom URL is configured
  useEffect(() => {
    if (isAuthenticated && appsScriptUrl) {
      loadData(false);
    }
  }, [isAuthenticated, appsScriptUrl]);

  const handleSaveAppsScriptUrl = (url: string) => {
    setAppsScriptUrl(url);
    localStorage.setItem('bailac_apps_script_url', url);
  };

  const handleResetDefault = () => {
    setAppsScriptUrl('');
    localStorage.removeItem('bailac_apps_script_url');
    const localRecords = parseRawCsvToRecords(RAW_CSV_DATA);
    setRecords(localRecords);
    saveStoredRecords(localRecords);
    addToast('info', 'Origen restablecido', 'Se cargaron los datos consolidados locales.');
  };

  // Handler for modifying an existing record or adding a new record
  const handleSaveRecord = (savedRecord: OtrRecord) => {
    setRecords((prev) => {
      const existsIndex = prev.findIndex((r) => r.id === savedRecord.id);
      let updated: OtrRecord[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = savedRecord;
        addToast(
          'success',
          'Registro Modificado',
          `Se actualizaron los datos del neumático ${savedRecord.serie || savedRecord.nroInterno || ''}.`
        );
      } else {
        updated = [savedRecord, ...prev];
        addToast(
          'success',
          'Nuevo Registro Agregado',
          `Se ingresó el neumático ${savedRecord.serie || savedRecord.nroInterno || ''} para ${savedRecord.cliente}.`
        );
      }
      saveStoredRecords(updated);
      return updated;
    });
  };

  // Handler for deleting a record
  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveStoredRecords(updated);
      addToast('info', 'Registro Eliminado', 'El neumático ha sido removido de la base de datos.');
      return updated;
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bailac_auth');
    setIsAuthenticated(false);
  };

  return (
    <div className={`min-h-screen bg-slate-100/70 text-slate-800 ${tvMode ? 'tv-active' : ''}`}>
      {/* Login Screen Modal */}
      {!isAuthenticated && (
        <LoginModal
          onSuccess={() => {
            setIsAuthenticated(true);
            addToast('success', 'Sesión iniciada', 'Bienvenido al sistema Bailac OTR.');
          }}
        />
      )}

      {/* Main App Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onRefresh={() => loadData(false)}
        isRefreshing={isRefreshing}
        secondsUntilAutoRefresh={secondsUntilAutoRefresh}
        tvMode={tvMode}
        onToggleTvMode={() => setTvMode((prev) => !prev)}
        onOpenAppsScriptModal={() => setIsAppsScriptModalOpen(true)}
        onLogout={handleLogout}
        totalRecordsCount={records.length}
        lastUpdated={lastUpdated}
      />

      {/* Main Workspace Body */}
      <main className={tvMode ? 'max-w-[1920px] mx-auto px-4 sm:px-8 py-6' : 'max-w-[1720px] mx-auto px-4 sm:px-6 py-6'}>
        {activeTab === 'operaciones' ? (
          <OperationsView
            records={records}
            onSelectRecord={(r) => setSelectedRecord(r)}
            onOpenCreateRecord={() => setIsCreateRecordModalOpen(true)}
            tvMode={tvMode}
          />
        ) : (
          <ManagementView
            records={records}
            onSelectRecord={(r) => setSelectedRecord(r)}
            onOpenCreateRecord={() => setIsCreateRecordModalOpen(true)}
            tvMode={tvMode}
          />
        )}
      </main>

      {/* Detail / Edit Inspection Modal */}
      <RecordDetailModal
        record={selectedRecord}
        isOpen={Boolean(selectedRecord)}
        isCreateMode={false}
        onClose={() => setSelectedRecord(null)}
        onSave={handleSaveRecord}
        onDelete={handleDeleteRecord}
      />

      {/* Create New Record Modal */}
      <RecordDetailModal
        record={null}
        isOpen={isCreateRecordModalOpen}
        isCreateMode={true}
        onClose={() => setIsCreateRecordModalOpen(false)}
        onSave={handleSaveRecord}
      />

      {/* Apps Script & Deployment Guide Modal */}
      <AppsScriptModal
        isOpen={isAppsScriptModalOpen}
        onClose={() => setIsAppsScriptModalOpen(false)}
        currentUrl={appsScriptUrl}
        onSaveUrl={handleSaveAppsScriptUrl}
        onResetDefault={handleResetDefault}
        onRefreshData={() => loadData(false)}
        isCustomUrlActive={Boolean(appsScriptUrl && appsScriptUrl.trim() !== '')}
      />

      {/* Toast Feedback Messages */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
