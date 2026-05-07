/**
 * app/(vendor)/studio/contracts.tsx
 * Exact port of web/app/vendor/studio/contracts/page.tsx
 *
 * GET  /api/v2/vendor/contracts/list/:vendorId
 * GET  /api/v2/vendor/tc/:vendorId
 * POST /api/v2/vendor/tc/:vendorId
 * POST /api/v2/vendor/contracts/create
 * POST /api/v2/vendor/contracts/:id/send
 * POST /api/v2/vendor/contracts/:id/acknowledge
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Animated, Linking, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API  = RAILWAY_URL;
const GOLD = '#C9A84C';
const BG   = '#F8F7F5';
const CARD = '#FFFFFF';
const DARK = '#111111';
const MUTED = '#8C8480';
const BORDER = '#E2DED8';
const GREEN = '#4A7C59';

const CG300   = 'CormorantGaramond_300Light';
const DM300   = 'DMSans_300Light';
const DM400   = 'DMSans_400Regular';
const JOST200 = 'Jost_200ExtraLight';
const JOST    = 'Jost_300Light';
const JOST400 = 'Jost_400Regular';

const CATEGORY_MAP: Record<string,string> = {
  mua:'mua', photographers:'photographer', photographer:'photographer',
  decorator:'decorator', decorators:'decorator',
  designers:'designer', designer:'designer',
  jewellers:'jeweller', jeweller:'jeweller',
  venue:'venue', venues:'venue',
};
function detectCategory(raw?: string) { return CATEGORY_MAP[(raw||'').toLowerCase()] || 'mua'; }

const EVENTS = ['Mehendi','Haldi','Sangeet','Ceremony','Reception'];

const DEFAULT_TC: Record<string,string> = {
  mua: `1. Booking is confirmed upon receipt of advance payment. Until advance is received, the date remains available to other clients.\n2. Balance is due on or before the date specified. Services may be withheld if balance is outstanding.\n3. Cancellation more than 60 days before event: Advance forfeited. No further amount due.\n4. Cancellation 30–60 days before event: 50% of total fee due in addition to advance already paid.\n5. Cancellation less than 30 days: 100% of total fee due.\n6. Client is responsible for disclosing any known skin allergies or conditions prior to service.\n7. Artist retains the right to photograph work for portfolio unless Client provides written objection.\n8. Delays caused by Client or venue exceeding 30 minutes may result in adjusted service scope.\n9. Total liability shall not exceed the total fee paid.\n10. This agreement is between Artist and Client only. The Dream Wedding is not a party to this agreement.`,
  photographer: `1. Booking confirmed upon receipt of advance payment.\n2. Balance is due on or before the date specified. Services may be withheld if balance is outstanding.\n3. Cancellation more than 90 days: Advance forfeited. No further amount due.\n4. Cancellation 60–90 days: 50% of total fee due.\n5. Cancellation 30–60 days: 75% of total fee due.\n6. Cancellation less than 30 days: 100% of total fee due.\n7. Edited photographs delivered within the timeline specified.\n8. Raw files are the intellectual property of the Photographer and not included unless explicitly agreed.\n9. Photographer retains creative rights and may use images for portfolio unless Client objects in writing.\n10. Total liability shall not exceed the total fee paid.\n11. This agreement is between Photographer and Client only. The Dream Wedding is not a party to this agreement.`,
  decorator: `1. Booking confirmed upon receipt of advance payment.\n2. Balance due on or before the date specified.\n3. Cancellation more than 90 days: Advance forfeited.\n4. Cancellation 60–90 days: 50% of total fee due.\n5. Cancellation 30–60 days: 75% of total fee due.\n6. Cancellation less than 30 days: 100% of total fee due.\n7. Seasonal availability may require substitutions of equivalent quality.\n8. Decorator retains the right to photograph completed work for portfolio use.\n9. Total liability shall not exceed the total fee paid.\n10. This agreement is between Decorator and Client only. The Dream Wedding is not a party to this agreement.`,
  designer: `1. No work commences until advance payment is received.\n2. Balance due at final fitting or before delivery as specified.\n3. Cancellation more than 90 days: Advance forfeited. Material costs additionally due if fabric already procured.\n4. Cancellation 60–90 days: 50% of total fee due.\n5. Cancellation 30–60 days: 75% of total fee due.\n6. Cancellation less than 30 days: 100% of total fee due.\n7. All original designs remain the intellectual property of the Designer.\n8. Designer retains the right to photograph garments for portfolio unless Client objects in writing.\n9. Total liability shall not exceed the total fee paid.\n10. This agreement is between Designer and Client only. The Dream Wedding is not a party to this agreement.`,
  jeweller: `1. No reservation or work commences until advance payment is received. Advance is non-refundable.\n2. Balance due before delivery or collection as specified.\n3. Custom or bespoke items: No refund once crafting commences.\n4. Cancellation more than 90 days: Advance forfeited.\n5. Cancellation 60–90 days: 50% of total fee due.\n6. All items comply with BIS hallmarking standards where applicable.\n7. Total liability shall not exceed the total fee paid.\n8. This agreement is between Jeweller and Client only. The Dream Wedding is not a party to this agreement.`,
  venue: `1. Booking confirmed upon receipt of advance payment.\n2. Balance due on or before the date specified.\n3. Confirmed guest count must be provided no later than 7 days before event.\n4. Cancellation more than 120 days: Advance forfeited.\n5. Cancellation 90–120 days: 25% of total fee due.\n6. Cancellation 60–90 days: 50% of total fee due.\n7. Cancellation 30–60 days: 75% of total fee due.\n8. Cancellation less than 30 days: 100% of total fee due.\n9. Total liability shall not exceed the total fee paid.\n10. This agreement is between Venue and Client only. The Dream Wedding is not a party to this agreement.`,
};

interface Contract { id: string; client_name: string; category: string; status: string; version: number; parent_contract_id?: string; created_at: string; sent_at?: string; acknowledged_at?: string; fields_json?: any; business_name?: string; client_phone?: string; client_email?: string; superseded_by?: string; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string,{bg:string;color:string;label:string}> = {
    draft:        { bg:'#F4F1EC',                   color:MUTED,    label:'Draft' },
    sent:         { bg:'rgba(201,168,76,0.12)',      color:'#8C6D20',label:'Sent' },
    acknowledged: { bg:'#E8F5E9',                   color:GREEN,    label:'Acknowledged' },
    superseded:   { bg:'#F0F0F0',                   color:'#AAAAAA',label:'Superseded' },
  };
  const st = map[status] || map.draft;
  return <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text></View>;
}

function ContractForm({ category, fields, onChange }: { category: string; fields: any; onChange: (f: any) => void }) {
  const F = (label: string, key: string, keyboard: any = 'default', placeholder = '') => (
    <View key={key} style={{ marginBottom: 16 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.fieldInput} value={fields[key] || ''}
        onChangeText={v => onChange({ ...fields, [key]: v })}
        placeholder={placeholder} placeholderTextColor="#C8C4BE"
        keyboardType={keyboard}
      />
    </View>
  );

  const EventsField = () => (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.fieldLabel}>Events Covered</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EVENTS.map(ev => {
          const sel = (fields.events_covered || []).includes(ev);
          return (
            <TouchableOpacity key={ev} style={[s.eventChip, sel && s.eventChipActive]}
              onPress={() => {
                const cur = fields.events_covered || [];
                onChange({ ...fields, events_covered: sel ? cur.filter((e:string) => e !== ev) : [...cur, ev] });
              }} activeOpacity={0.8}>
              <Text style={[s.eventChipText, sel && s.eventChipTextActive]}>{ev}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View>
      {F('Client Name *', 'client_name', 'default', 'Client name')}
      {['mua','photographer','decorator','venue'].includes(category) && <>
        {F('Event / Wedding Date', 'wedding_date', 'default')}
        <EventsField />
      </>}
      {category === 'designer' && <>
        {F('Outfit Type', 'outfit_type', 'default', 'Lehenga / Saree / Gown / Other')}
        {F('Trial Date', 'trial_date')}
        {F('Delivery Date', 'delivery_date')}
        {F('Alteration Rounds Included', 'alteration_rounds', 'numeric', '2')}
        {F('Customisation Scope', 'customisation_scope', 'default', 'Describe customisation')}
      </>}
      {category === 'jeweller' && <>
        {F('Items Ordered', 'items_ordered', 'default', 'Describe items')}
        {F('Delivery Date', 'delivery_date')}
      </>}
      {F('Total Fee (₹)', 'total_fee', 'numeric', '0')}
      {F('Advance Paid (₹)', 'advance_paid', 'numeric', '0')}
      {F('Balance Due Date', 'balance_due_date')}
      {category === 'mua' && <>
        {F('Team Size', 'team_size', 'numeric', '1')}
        {F('Reporting Time', 'reporting_time', 'default', 'e.g. 5:00 AM')}
      </>}
      {category === 'photographer' && <>
        {F('Hours of Coverage', 'hours_coverage', 'numeric', '8')}
        {F('Edited Photos Delivered', 'photos_delivered', 'numeric', '300')}
        {F('Delivery Timeline (weeks)', 'delivery_weeks', 'numeric', '4')}
      </>}
      {category === 'decorator' && F('Venue Name', 'venue_name', 'default', 'Venue name')}
      {category === 'venue' && <>
        {F('Guest Count', 'guest_count', 'numeric', '0')}
        {F('Maximum Capacity', 'max_capacity', 'numeric', '0')}
        {F('Venue Curfew', 'venue_curfew', 'default', 'e.g. 11:00 PM')}
      </>}
      {F('Additional Notes', 'notes', 'default', 'Optional')}
    </View>
  );
}

export default function ContractsScreen() {
  const [vendorId,       setVendorId]       = useState('');
  const [vendorName,     setVendorName]     = useState('');
  const [vendorCategory, setVendorCategory] = useState('mua');
  const [tab,            setTab]            = useState<'contracts'|'tc'>('contracts');
  const [contracts,      setContracts]      = useState<Contract[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [tcText,         setTcText]         = useState('');
  const [tcSaving,       setTcSaving]       = useState(false);
  const [tcDirty,        setTcDirty]        = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [formFields,     setFormFields]     = useState<any>({});
  const [revisingId,     setRevisingId]     = useState<string|null>(null);
  const [saving,         setSaving]         = useState(false);
  const [sendingContract, setSendingContract] = useState<Contract|null>(null);
  const [viewingContract, setViewingContract] = useState<Contract|null>(null);
  const [toast,          setToast]          = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  }

  useEffect(() => {
    getVendorSession().then((s: any) => {
      if (!s) return;
      const vid  = s.vendorId || s.id || '';
      const vname = s.vendorName || s.name || '';
      const vcat  = detectCategory(s.category);
      setVendorId(vid); setVendorName(vname); setVendorCategory(vcat);

      fetch(`${API}/api/v2/vendor/contracts/list/${vid}`).then(r=>r.json()).then(d=>{ setContracts(d.data||[]); setLoading(false); }).catch(()=>setLoading(false));
      fetch(`${API}/api/v2/vendor/tc/${vid}`).then(r=>r.json()).then(d=>{
        if (d.tc_text) setTcText(d.tc_text);
        else { setTcText(DEFAULT_TC[vcat]||DEFAULT_TC.mua); setTcDirty(true); }
      }).catch(()=>{ setTcText(DEFAULT_TC[vcat]||DEFAULT_TC.mua); setTcDirty(true); });
    });
  }, []);

  async function saveTC() {
    if (!vendorId || tcSaving) return;
    setTcSaving(true);
    try {
      await fetch(`${API}/api/v2/vendor/tc/${vendorId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tc_text:tcText}) });
      setTcDirty(false); showToast('Terms & Conditions saved');
    } catch { showToast('Could not save. Try again.'); }
    setTcSaving(false);
  }

  function openRevise(contract: Contract) { setRevisingId(contract.id); setFormFields(contract.fields_json||{}); setShowForm(true); }

  async function saveContract() {
    if (!formFields.client_name?.trim() || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/v2/vendor/contracts/create`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ vendor_id:vendorId, category:vendorCategory, business_name:vendorName, client_name:formFields.client_name, client_phone:formFields.client_phone||null, client_email:formFields.client_email||null, fields_json:formFields, parent_contract_id:revisingId||null }),
      });
      const d = await r.json();
      if (d.success) {
        setContracts(prev => revisingId ? [d.data,...prev.map((c:Contract)=>c.id===revisingId?{...c,status:'superseded',superseded_by:d.data.id}:c)] : [d.data,...prev]);
        setShowForm(false); setFormFields({}); setRevisingId(null);
        showToast(revisingId ? 'Revised contract created' : 'Contract created');
        setSendingContract(d.data);
      } else showToast(d.error||'Error creating contract');
    } catch { showToast('Network error'); }
    setSaving(false);
  }

  async function markAcknowledged(id: string) {
    try {
      await fetch(`${API}/api/v2/vendor/contracts/${id}/acknowledge`, { method:'POST' });
      setContracts(prev=>prev.map((c:Contract)=>c.id===id?{...c,status:'acknowledged',acknowledged_at:new Date().toISOString()}:c));
      showToast('Marked as acknowledged');
    } catch { showToast('Error updating status'); }
  }

  function buildContractSummary(contract: Contract) {
    const f = contract.fields_json || {};
    const evList = (f.events_covered||[]).join(', ');
    return [
      `Contract from ${contract.business_name || vendorName}`,
      `Client: ${contract.client_name}`,
      f.wedding_date ? `Date: ${f.wedding_date}` : '',
      evList ? `Events: ${evList}` : '',
      f.total_fee ? `Total: ₹${Number(f.total_fee).toLocaleString('en-IN')}` : '',
      f.advance_paid ? `Advance: ₹${Number(f.advance_paid).toLocaleString('en-IN')}` : '',
      f.balance_due_date ? `Balance due: ${f.balance_due_date}` : '',
      f.notes ? `Notes: ${f.notes}` : '',
      '', 'Generated via The Dream Wedding · thedreamwedding.in',
    ].filter(Boolean).join('\n');
  }

  async function markSent(contract: Contract, channel: string) {
    try {
      await fetch(`${API}/api/v2/vendor/contracts/${contract.id}/send`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({channel}) });
      setContracts(prev=>prev.map((c:Contract)=>c.id===contract.id?{...c,status:'sent',sent_at:new Date().toISOString()}:c));
      setSendingContract(null); showToast('Contract marked as sent');
    } catch {}
  }

  function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }

  return (
    <View style={s.root}>
      {!!toast && <Animated.View style={[s.toast,{opacity:toastAnim}]}><Text style={s.toastText}>{toast}</Text></Animated.View>}

      {/* Contract form sheet */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setShowForm(false)}>
        <View style={{ flex:1, backgroundColor:CARD }}>
          <ScrollView contentContainerStyle={{ padding:20 }} keyboardShouldPersistTaps="handled">
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{revisingId ? 'Send Revised Contract' : 'New Contract'}</Text>
            <Text style={s.sheetSub}>{revisingId ? 'Creates v2 · marks original superseded' : 'Fill details · review every field before sending'}</Text>
            <ContractForm category={vendorCategory} fields={formFields} onChange={setFormFields} />
            <Text style={s.fieldLabel}>Client Contact (for sending)</Text>
            <TextInput style={s.fieldInput} value={formFields.client_phone||''} onChangeText={v=>setFormFields((f:any)=>({...f,client_phone:v}))} placeholder="WhatsApp number" placeholderTextColor="#C8C4BE" keyboardType="phone-pad" />
            <TextInput style={[s.fieldInput,{marginTop:12}]} value={formFields.client_email||''} onChangeText={v=>setFormFields((f:any)=>({...f,client_email:v}))} placeholder="Email address (optional)" placeholderTextColor="#C8C4BE" keyboardType="email-address" />
            <View style={{ flexDirection:'row', gap:10, marginTop:8 }}>
              <TouchableOpacity style={[s.createBtn, (!formFields.client_name?.trim()||saving)&&{opacity:0.5}]} onPress={saveContract} disabled={!formFields.client_name?.trim()||saving} activeOpacity={0.85}>
                <Text style={s.createBtnText}>{saving ? 'Saving…' : revisingId ? 'Create Revision →' : 'Create & Send →'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={()=>{setShowForm(false);setFormFields({});setRevisingId(null);}} activeOpacity={0.7}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Send sheet */}
      <Modal visible={!!sendingContract} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSendingContract(null)}>
        {sendingContract && (
          <ScrollView contentContainerStyle={{ padding:20 }} keyboardShouldPersistTaps="handled">
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Send Contract</Text>
            <View style={{ marginBottom:24, gap:12 }}>
              {sendingContract.client_phone ? (
                <TouchableOpacity style={s.sendWaBtn} activeOpacity={0.85} onPress={()=>{
                  const summary = buildContractSummary(sendingContract);
                  Linking.openURL(`https://wa.me/${sendingContract.client_phone!.replace(/\D/g,'')}?text=${encodeURIComponent(summary)}`);
                  markSent(sendingContract,'whatsapp');
                }}>
                  <Text style={s.sendWaBtnText}>Send via WhatsApp</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.sendDisabledBtn}><Text style={s.sendDisabledBtnText}>WhatsApp — no phone number</Text></View>
              )}
              {sendingContract.client_email ? (
                <TouchableOpacity style={s.sendEmailBtn} activeOpacity={0.85} onPress={()=>{
                  const summary = buildContractSummary(sendingContract);
                  Linking.openURL(`mailto:${sendingContract.client_email}?subject=${encodeURIComponent('Contract from '+vendorName)}&body=${encodeURIComponent(summary)}`);
                  markSent(sendingContract,'email');
                }}>
                  <Text style={s.sendEmailBtnText}>Send via Email</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.sendDisabledBtn,{borderWidth:0.5,borderColor:BORDER}]}><Text style={s.sendDisabledBtnText}>Email — no address</Text></View>
              )}
            </View>
            <TouchableOpacity onPress={()=>setSendingContract(null)}><Text style={s.cancelBtnText}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        )}
      </Modal>

      {/* Contract detail sheet */}
      <Modal visible={!!viewingContract} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setViewingContract(null)}>
        {viewingContract && (
          <ScrollView contentContainerStyle={{ padding:20 }} keyboardShouldPersistTaps="handled">
            <View style={s.sheetHandle} />
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <View>
                <Text style={s.sheetTitle}>{viewingContract.client_name}</Text>
                <StatusBadge status={viewingContract.status} />
              </View>
              <TouchableOpacity onPress={()=>setViewingContract(null)}><Text style={{ fontFamily:DM400, fontSize:18, color:MUTED, padding:4 }}>✕</Text></TouchableOpacity>
            </View>
            {viewingContract.fields_json && Object.entries(viewingContract.fields_json).filter(([k,v])=>v&&k!=='client_name').map(([k,v])=>(
              <View key={k} style={{ marginBottom:12, paddingBottom:12, borderBottomWidth:0.5, borderBottomColor:'#F0EDE8' }}>
                <Text style={s.fieldLabel}>{k.replace(/_/g,' ')}</Text>
                <Text style={{ fontFamily:DM300, fontSize:13, color:DARK }}>{Array.isArray(v)?(v as string[]).join(', '):String(v)}</Text>
              </View>
            ))}
            <View style={{ gap:10, marginTop:8 }}>
              {viewingContract.status==='draft' && (
                <TouchableOpacity style={s.createBtn} onPress={()=>{setSendingContract(viewingContract);setViewingContract(null);}} activeOpacity={0.85}>
                  <Text style={s.createBtnText}>Send Contract →</Text>
                </TouchableOpacity>
              )}
              {viewingContract.status==='sent' && (
                <TouchableOpacity style={s.ackBtn} onPress={()=>{markAcknowledged(viewingContract.id);setViewingContract(null);}} activeOpacity={0.85}>
                  <Text style={s.ackBtnText}>Mark as Acknowledged</Text>
                </TouchableOpacity>
              )}
              {viewingContract.status!=='superseded' && (
                <TouchableOpacity style={s.cancelBtn} onPress={()=>{openRevise(viewingContract);setViewingContract(null);}} activeOpacity={0.7}>
                  <Text style={s.cancelBtnText}>Send Revised Contract</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* Main */}
      <ScrollView contentContainerStyle={{ padding:20, paddingBottom:48 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity onPress={()=>router.back()} activeOpacity={0.7} style={{alignSelf:'flex-start',marginBottom:20}}>
          <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
        </TouchableOpacity>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20 }}>
          <View>
            <Text style={s.eyebrow}>STUDIO</Text>
            <Text style={s.pageTitle}>Contracts</Text>
          </View>
          {tab==='contracts' && (
            <TouchableOpacity style={s.newBtn} onPress={()=>{setRevisingId(null);setFormFields({});setShowForm(true);}} activeOpacity={0.85}>
              <Text style={s.newBtnText}>+ New</Text>
            </TouchableOpacity>
          )}
          {tab==='tc' && tcDirty && (
            <TouchableOpacity style={[s.newBtn,{backgroundColor:GOLD}]} onPress={saveTC} disabled={tcSaving} activeOpacity={0.85}>
              <Text style={[s.newBtnText,{color:'#0C0A09'}]}>{tcSaving?'Saving…':'Save T&C'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          {(['contracts','tc'] as const).map(t=>(
            <TouchableOpacity key={t} style={[s.tabItem, tab===t&&s.tabItemActive]} onPress={()=>setTab(t)} activeOpacity={0.8}>
              <Text style={[s.tabText, tab===t&&s.tabTextActive]}>{t==='contracts'?'Contracts':'Terms & Conditions'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contracts list */}
        {tab==='contracts' && (
          loading ? (
            <View style={s.shimmer} />
          ) : contracts.length===0 ? (
            <View style={{textAlign:'center',marginTop:60} as any}>
              <Text style={s.emptyTitle}>No contracts yet.</Text>
              <Text style={s.emptySub}>Create your first contract above.</Text>
            </View>
          ) : (
            <View style={{gap:8}}>
              {contracts.map((c:Contract)=>(
                <TouchableOpacity key={c.id} style={[s.contractCard,c.status==='superseded'&&{opacity:0.5}]} onPress={()=>setViewingContract(c)} activeOpacity={0.85}>
                  <View style={{flex:1}}>
                    <Text style={s.contractName}>{c.client_name}</Text>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:4}}>
                      <StatusBadge status={c.status}/>
                      {c.version>1&&<Text style={s.versionTag}>v{c.version}</Text>}
                      <Text style={s.contractDate}>{formatDate(c.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={{color:'#C0BCB6',fontSize:16}}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* T&C tab */}
        {tab==='tc' && (
          <>
            <Text style={s.tcHint}>Your standard terms. Pre-filled for your category. Edit to make them yours. Included with every contract you send.</Text>
            <TextInput
              style={s.tcInput} value={tcText}
              onChangeText={v=>{setTcText(v);setTcDirty(true);}}
              multiline numberOfLines={20} textAlignVertical="top"
            />
            <View style={s.tcNote}>
              <Text style={s.tcNoteText}>TDW is a platform intermediary only and is not a party to any agreement between you and your clients.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex:1, backgroundColor:BG },
  toast:   { position:'absolute', top:16, left:24, right:24, zIndex:100, backgroundColor:DARK, borderRadius:8, padding:12, alignItems:'center' },
  toastText: { fontFamily:DM300, fontSize:12, color:'#F8F7F5' },

  eyebrow:   { fontFamily:JOST200, fontSize:9, letterSpacing:2.2, textTransform:'uppercase', color:MUTED, marginBottom:4 },
  pageTitle: { fontFamily:CG300, fontSize:28, color:DARK },
  newBtn:    { height:36, backgroundColor:DARK, borderRadius:100, paddingHorizontal:16, alignItems:'center', justifyContent:'center' },
  newBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.6, textTransform:'uppercase', color:'#F8F7F5' },

  tabBar:      { flexDirection:'row', borderBottomWidth:0.5, borderBottomColor:BORDER, marginBottom:24 },
  tabItem:     { flex:1, height:40, alignItems:'center', justifyContent:'center' },
  tabItemActive: { borderBottomWidth:2, borderBottomColor:DARK },
  tabText:     { fontFamily:JOST, fontSize:9, letterSpacing:1.6, textTransform:'uppercase', color:MUTED },
  tabTextActive: { fontFamily:JOST400, color:DARK },

  shimmer:      { height:60, borderRadius:12, backgroundColor:'#EEECE8' },
  emptyTitle:   { fontFamily:CG300, fontSize:20, fontStyle:'italic', color:MUTED, marginBottom:8, textAlign:'center' },
  emptySub:     { fontFamily:DM300, fontSize:13, color:MUTED, textAlign:'center' },

  contractCard:  { backgroundColor:CARD, borderWidth:0.5, borderColor:BORDER, borderRadius:14, padding:14, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  contractName:  { fontFamily:CG300, fontSize:17, color:DARK },
  contractDate:  { fontFamily:DM300, fontSize:11, color:MUTED },
  versionTag:    { fontFamily:JOST, fontSize:8, letterSpacing:1, color:MUTED },

  badge:     { paddingHorizontal:10, paddingVertical:3, borderRadius:100 },
  badgeText: { fontFamily:JOST, fontSize:8, letterSpacing:1, textTransform:'uppercase' },

  tcHint:  { fontFamily:DM300, fontSize:12, color:MUTED, marginBottom:16, lineHeight:18 },
  tcInput: { backgroundColor:CARD, borderWidth:0.5, borderColor:BORDER, borderRadius:12, padding:16, fontFamily:DM300, fontSize:13, color:'#3C3835', lineHeight:22, minHeight:300 },
  tcNote:  { marginTop:12, padding:12, backgroundColor:'rgba(201,168,76,0.06)', borderRadius:8, borderWidth:0.5, borderColor:'rgba(201,168,76,0.2)' },
  tcNoteText: { fontFamily:DM300, fontSize:11, color:MUTED, lineHeight:17 },

  // Sheets
  sheetHandle: { width:36, height:4, borderRadius:2, backgroundColor:BORDER, alignSelf:'center', marginBottom:20 },
  sheetTitle:  { fontFamily:CG300, fontSize:24, color:DARK, marginBottom:4 },
  sheetSub:    { fontFamily:DM300, fontSize:12, color:MUTED, marginBottom:20 },
  fieldLabel:  { fontFamily:JOST200, fontSize:8, letterSpacing:1.8, textTransform:'uppercase', color:MUTED, marginBottom:6 },
  fieldInput:  { fontFamily:DM300, fontSize:13, color:DARK, borderBottomWidth:1, borderBottomColor:BORDER, paddingVertical:6 },
  eventChip:   { paddingHorizontal:14, paddingVertical:6, borderRadius:100, borderWidth:0.5, borderColor:BORDER },
  eventChipActive: { borderColor:GOLD, backgroundColor:'rgba(201,168,76,0.08)' },
  eventChipText:   { fontFamily:DM300, fontSize:12, color:MUTED },
  eventChipTextActive: { color:GOLD },
  createBtn:   { flex:1, height:48, backgroundColor:DARK, borderRadius:100, alignItems:'center', justifyContent:'center' },
  createBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.8, textTransform:'uppercase', color:'#F8F7F5' },
  cancelBtn:   { height:48, paddingHorizontal:20, borderWidth:0.5, borderColor:BORDER, borderRadius:100, alignItems:'center', justifyContent:'center' },
  cancelBtnText: { fontFamily:DM300, fontSize:13, color:MUTED, textAlign:'center' },
  ackBtn:      { height:48, borderWidth:0.5, borderColor:GREEN, borderRadius:100, alignItems:'center', justifyContent:'center' },
  ackBtnText:  { fontFamily:JOST, fontSize:9, letterSpacing:1.8, textTransform:'uppercase', color:GREEN },
  sendWaBtn:   { height:48, backgroundColor:DARK, borderRadius:100, alignItems:'center', justifyContent:'center' },
  sendWaBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.8, textTransform:'uppercase', color:'#F8F7F5' },
  sendEmailBtn: { height:48, borderWidth:0.5, borderColor:BORDER, borderRadius:100, alignItems:'center', justifyContent:'center' },
  sendEmailBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.8, textTransform:'uppercase', color:DARK },
  sendDisabledBtn: { height:48, backgroundColor:'transparent', borderRadius:100, alignItems:'center', justifyContent:'center' },
  sendDisabledBtnText: { fontFamily:JOST, fontSize:9, letterSpacing:1.8, textTransform:'uppercase', color:'#C0BCB6' },
});
