import React, { useEffect, useState } from 'react';
import { ApiSession, apiRequest } from '../services/api';
import { ArrowRight, CheckCircle2, ChefHat, ClipboardList, PackageCheck, Plus, RefreshCw, ShieldCheck, Truck } from 'lucide-react';

interface OperationsViewProps {
  session: ApiSession;
  onLogout: () => void;
}
type Tab = 'orders'|'foods'|'dishes'|'zones'|'settings';
const stageLabels: Record<string,string> = {
  queued:'بانتظار التحضير', preparing:'قيد التحضير', packed:'تم الوزن والتعبئة',
  out_for_delivery:'خرج للتوصيل', delivered:'تم التسليم',
};

export const OperationsView: React.FC<OperationsViewProps> = ({session,onLogout}) => {
  const role = session.user.role;
  const isAdmin = role === 'admin';
  const isDelivery = role === 'delivery';
  const [tab,setTab] = useState<Tab>('orders');
  const [orders,setOrders] = useState<any[]>([]);
  const [foods,setFoods] = useState<any[]>([]);
  const [zones,setZones] = useState<any[]>([]);
  const [dishes,setDishes] = useState<any[]>([]);
  const [staff,setStaff] = useState<any[]>([]);
  const [settings,setSettings] = useState<any>({handling_pct:7,service_fee_per_meal:200,cutoff_hour:16,daily_capacity_boxes:0});
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const [food,setFood] = useState<any>({
    name:'',category:'protein',kcal:'',protein:'',carbs:'',fat:'',fiber:'0',
    priceDzdPer100:'',nutritionBasis:'raw',nutritionSource:'',sourceRecordId:'',allergens:[],
  });
  const [dishName,setDishName] = useState('');
  const [dishFoodId,setDishFoodId] = useState('');
  const [dishGrams,setDishGrams] = useState('100');
  const [dishIngredients,setDishIngredients] = useState<Array<{foodId:string;grams:number}>>([]);
  const [zone,setZone] = useState({title:'',areas:'',serviceHours:'',feeDzd:'0'});
  const [driverIds,setDriverIds] = useState<Record<string,string>>({});

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      if (isDelivery) {
        const data = await apiRequest<{orders:any[]}>('/api/delivery/orders',session.token);
        setOrders(data.orders);
      } else {
        const data = await apiRequest<{orders:any[]}>(
          isAdmin ? '/api/admin/orders' : '/api/kitchen/orders',
          session.token
        );
        setOrders(data.orders);
      }
      if (isAdmin) {
        const [foodData,zoneData,dishData,settingsData,staffData] = await Promise.all([
          apiRequest<{foods:any[]}>('/api/admin/foods',session.token),
          apiRequest<{zones:any[]}>('/api/admin/zones',session.token),
          apiRequest<{dishes:any[]}>('/api/admin/dishes',session.token),
          apiRequest<{settings:any}>('/api/admin/settings',session.token),
          apiRequest<{staff:any[]}>('/api/admin/staff',session.token),
        ]);
        setFoods(foodData.foods);
        setZones(zoneData.zones);
        setDishes(dishData.dishes);
        setStaff(staffData.staff);
        if (settingsData.settings) setSettings(settingsData.settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات العمليات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [session.token]);

  const run = async (task: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setNotice('');
    try { await task(); setNotice(success); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر إكمال العملية.'); }
    finally { setBusy(false); }
  };

  const createFood = () => run(async () => {
    await apiRequest('/api/admin/foods',session.token,{method:'POST',body:JSON.stringify({
      ...food,kcal:Number(food.kcal),protein:Number(food.protein),carbs:Number(food.carbs),
      fat:Number(food.fat),fiber:Number(food.fiber),priceDzdPer100:Number(food.priceDzdPer100),
    })});
    setFood({name:'',category:'protein',kcal:'',protein:'',carbs:'',fat:'',fiber:'0',priceDzdPer100:'',nutritionBasis:'raw',nutritionSource:'',sourceRecordId:'',allergens:[]});
  },'حُفظ المكوّن كمسودة غير موثقة وغير نشطة.');

  const verifyFood = (item:any) => run(async () => {
    await apiRequest('/api/admin/foods/'+item.id+'/verification',session.token,{
      method:'PATCH',body:JSON.stringify({verified:true,nutritionBasis:item.nutrition_basis,nutritionSource:item.nutrition_source,sourceRecordId:item.source_record_id ?? ''}),
    });
  },'تم اعتماد سجل التوثيق.');

  const toggleFood = (item:any) => run(async () => {
    await apiRequest('/api/admin/foods/'+item.id+'/active',session.token,{
      method:'PATCH',body:JSON.stringify({active:!item.active}),
    });
  },'تم تحديث حالة المكوّن.');

  const addDishIngredient = () => {
    if (!dishFoodId || Number(dishGrams)<=0) return;
    setDishIngredients((prev)=>[...prev,{foodId:dishFoodId,grams:Number(dishGrams)}]);
  };
  const createDish = () => run(async () => {
    await apiRequest('/api/admin/dishes',session.token,{
      method:'POST',body:JSON.stringify({name:dishName,ingredients:dishIngredients}),
    });
    setDishName('');setDishIngredients([]);
  },'أُضيف الطبق كمسودة غير نشطة.');

  const toggleDish = (dish:any) => run(async () => {
    await apiRequest('/api/admin/dishes/'+dish.id+'/active',session.token,{
      method:'PATCH',body:JSON.stringify({active:!dish.active}),
    });
  },'تم تحديث حالة الطبق.');

  const createZone = () => run(async () => {
    await apiRequest('/api/admin/zones',session.token,{
      method:'POST',body:JSON.stringify({...zone,feeDzd:Number(zone.feeDzd)}),
    });
    setZone({title:'',areas:'',serviceHours:'',feeDzd:'0'});
  },'أُضيف نطاق الخدمة بحالة متوقفة.');

  const toggleZone = (item:any) => run(async () => {
    await apiRequest('/api/admin/zones/'+item.id,session.token,{
      method:'PATCH',body:JSON.stringify({active:!item.active}),
    });
  },'تم تحديث نطاق الخدمة.');

  const saveSettings = () => run(async () => {
    await apiRequest('/api/admin/settings',session.token,{
      method:'PATCH',body:JSON.stringify({
        handlingPct:Number(settings.handling_pct),
        serviceFeePerMeal:Number(settings.service_fee_per_meal),
        cutoffHour:Number(settings.cutoff_hour),
        dailyCapacityBoxes:Number(settings.daily_capacity_boxes),
      }),
    });
  },'حُفظت إعدادات التشغيل.');

  const updateStage = (order:any,stage:string) => run(async () => {
    await apiRequest('/api/kitchen/orders/'+order.id+'/stage',session.token,{
      method:'PATCH',body:JSON.stringify({stage}),
    });
  },'تم تحديث مرحلة الطلب.');

  const assignDriver = (order:any) => run(async () => {
    await apiRequest('/api/admin/orders/'+order.id+'/assign-delivery',session.token,{
      method:'POST',body:JSON.stringify({deliveryUserId:driverIds[order.id]}),
    });
  },'تم إسناد الطلب إلى حساب التوصيل.');

  const confirmWaitlist = (order:any) => run(async () => {
    await apiRequest('/api/admin/orders/'+order.id+'/confirm',session.token,{method:'POST'});
  },'تم تأكيد الطلب بعد التحقق من السعة.');

  const field = (label:string,value:string,onChange:(value:string)=>void,type='text',placeholder='') => (
    <label className="block space-y-1">
      <span className="text-[11px] text-[#aaa79b]">{label}</span>
      <input value={value} onChange={(e)=>onChange(e.target.value)} type={type} placeholder={placeholder}
        className="w-full rounded-lg border border-[#34372e] bg-[#0c100d] px-3 py-2.5 text-xs text-[#f4f1e9] outline-none focus:border-[#c9a85c]" />
    </label>
  );

  return (
    <main dir="rtl" className="min-h-screen bg-[#0b0e0c] text-[#f4f1e9] px-3 py-5 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#3b3a2d] bg-[#121612] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a85c]/10 text-[#d8c18b]">
              {isDelivery?<Truck size={19}/>:<ChefHat size={19}/>}
            </div>
            <div>
              <div className="text-[10px] tracking-[.2em] text-[#c9b783]">NUTRIFIT · OPERATIONS</div>
              <h1 className="mt-1 text-lg font-bold">{isAdmin?'مركز إدارة التشغيل':isDelivery?'مسار التسليم':'لوحة إنتاج المطبخ'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>void refresh()} className="rounded-lg border border-[#34372e] p-2 text-[#c9b783]" aria-label="تحديث"><RefreshCw size={16}/></button>
            <button onClick={onLogout} className="rounded-lg border border-[#34372e] px-3 py-2 text-xs text-[#c9b783]">تسجيل الخروج</button>
          </div>
        </header>

        {isAdmin && (
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[#292d25] bg-[#121612] p-1">
            {(['orders','foods','dishes','zones','settings'] as Tab[]).map((key)=>(
              <button key={key} onClick={()=>setTab(key)} className={'shrink-0 rounded-lg px-4 py-2.5 text-xs font-bold '+(tab===key?'bg-[#2b2619] text-[#e5cf94]':'text-[#929084]')}>
                {({orders:'الطلبات والمطبخ',foods:'قاعدة الأغذية',dishes:'وصفات الشيف',zones:'مناطق الخدمة',settings:'التشغيل والأسعار'} as Record<Tab,string>)[key]}
              </button>
            ))}
          </nav>
        )}

        {error && <div role="alert" className="rounded-xl border border-[#a64d42]/50 bg-[#281714] p-3 text-xs leading-5 text-[#efb9ad]">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-[#517b60]/50 bg-[#142219] p-3 text-xs leading-5 text-[#b8d4bd]">{notice}</div>}
        {loading && <div className="py-10 text-center text-sm text-[#c9b783]">جارٍ تحميل بيانات التشغيل…</div>}

        {!loading && (tab==='orders' || !isAdmin) && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">قائمة العمل · {orders.length} طلب</h2>
              <span className="text-[10px] text-[#88877b]">بيانات الخادم</span>
            </div>
            {orders.length===0 && <div className="rounded-xl border border-[#292d25] bg-[#121612] p-6 text-center text-xs text-[#88877b]">لا توجد طلبات مخصصة لهذا اليوم أو لهذا الحساب.</div>}
            {orders.map((order)=>(
              <article key={order.id} className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#e5cf94]">{order.order_number}</div>
                    <div className="mt-1 text-[11px] text-[#aaa79b]">{order.customer_name} · {order.delivery_zone_title} · {order.meal_count} وجبات</div>
                  </div>
                  <span className="rounded-full border border-[#c9a85c]/30 px-3 py-1 text-[10px] text-[#d8c18b]">{stageLabels[order.production_stage ?? 'queued'] ?? order.order_status}</span>
                </div>
                {Array.isArray(order.items) && <div className="grid gap-2 sm:grid-cols-2">
                  {order.items.map((item:any,index:number)=>(
                    <div key={index} className="rounded-lg bg-[#0c100d] p-3 text-xs">
                      <div className="font-bold">{item.label}</div>
                      <div className="mt-1 text-[#aaa79b]">{item.slot_name} · {Math.round(Number(item.grams))}غ</div>
                      {item.ingredients?.length>0 && <div className="mt-1 text-[10px] text-[#88877b]">{item.ingredients.map((x:any)=>x.name+' '+Math.round(Number(x.grams))+'غ').join(' · ')}</div>}
                    </div>
                  ))}
                </div>}
                {!isDelivery && order.production_stage && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#292d25] pt-3">
                    <label className="text-[11px] text-[#aaa79b]">تحديث المرحلة</label>
                    <select value={order.production_stage} onChange={(e)=>void updateStage(order,e.target.value)} disabled={busy}
                      className="min-w-0 flex-1 rounded-lg border border-[#34372e] bg-[#0c100d] px-3 py-2 text-xs">
                      {(isAdmin?['queued','preparing','packed','out_for_delivery','delivered']:['queued','preparing','packed']).map((stage)=>(
                        <option key={stage} value={stage}>{stageLabels[stage]}</option>
                      ))}
                    </select>
                  </div>
                )}
                {isDelivery && (
                  <div className="flex items-center justify-between border-t border-[#292d25] pt-3 text-xs">
                    <span className="text-[#aaa79b]">{order.production_stage==='packed'?'استلام الطلب من المطبخ':order.production_stage==='out_for_delivery'?'تسليم الطلب للعميل':'بانتظار تجهيز المطبخ'}</span>
                    {order.production_stage==='packed' && <button onClick={()=>void updateStage(order,'out_for_delivery')} disabled={busy} className="rounded-lg bg-[#c9a85c] px-4 py-2 font-bold text-[#17140d] disabled:opacity-40">بدء التوصيل</button>}
                    {order.production_stage==='out_for_delivery' && <button onClick={()=>void updateStage(order,'delivered')} disabled={busy} className="rounded-lg bg-[#c9a85c] px-4 py-2 font-bold text-[#17140d] disabled:opacity-40">تأكيد التسليم</button>}
                  </div>
                )}
                {isAdmin && (
                  <div className="flex flex-wrap gap-2 border-t border-[#292d25] pt-3">
                    {order.order_status==='waitlisted' && <button onClick={()=>void confirmWaitlist(order)} disabled={busy} className="rounded-lg bg-[#c9a85c] px-3 py-2 text-[11px] font-bold text-[#17140d] disabled:opacity-40">تأكيد من قائمة الانتظار</button>}
                    {order.order_status==='confirmed' && <>
                      <select value={driverIds[order.id]??''} onChange={(e)=>setDriverIds((prev)=>({...prev,[order.id]:e.target.value}))}
                        className="min-w-0 flex-1 rounded-lg border border-[#34372e] bg-[#0c100d] px-3 py-2 text-[11px]">
                        <option value="">اختر الموصّل</option>
                        {staff.filter((person)=>person.role==='delivery').map((person)=><option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}
                      </select>
                      <button onClick={()=>void assignDriver(order)} disabled={busy || !driverIds[order.id]}
                        className="rounded-lg border border-[#c9a85c]/40 px-3 py-2 text-[11px] text-[#e5cf94] disabled:opacity-40">إسناد التوصيل</button>
                    </>}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {!loading && isAdmin && tab==='foods' && (
          <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <form onSubmit={(e)=>{e.preventDefault();void createFood();}} className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
              <h2 className="text-sm font-bold">إضافة مكوّن غذائي</h2>
              {field('اسم المكوّن',food.name,(v)=>setFood({...food,name:v}))}
              <label className="block text-[11px] text-[#aaa79b]">التصنيف
                <select value={food.category} onChange={(e)=>setFood({...food,category:e.target.value})} className="mt-1 w-full rounded-lg border border-[#34372e] bg-[#0c100d] p-2.5 text-xs">
                  <option value="protein">بروتين</option><option value="carb">كربوهيدرات</option><option value="fat">دهون</option><option value="veg">خضروات</option><option value="juice">مشروبات</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {field('kcal / 100غ',food.kcal,(v)=>setFood({...food,kcal:v}),'number')}
                {field('بروتين غ',food.protein,(v)=>setFood({...food,protein:v}),'number')}
                {field('كربوهيدرات غ',food.carbs,(v)=>setFood({...food,carbs:v}),'number')}
                {field('دهون غ',food.fat,(v)=>setFood({...food,fat:v}),'number')}
                {field('ألياف غ',food.fiber,(v)=>setFood({...food,fiber:v}),'number')}
                {field('السعر دج / 100غ',food.priceDzdPer100,(v)=>setFood({...food,priceDzdPer100:v}),'number')}
              </div>
              <label className="block text-[11px] text-[#aaa79b]">حالة الوزن
                <select value={food.nutritionBasis} onChange={(e)=>setFood({...food,nutritionBasis:e.target.value})} className="mt-1 w-full rounded-lg border border-[#34372e] bg-[#0c100d] p-2.5 text-xs">
                  <option value="raw">نيء</option><option value="cooked">مطبوخ</option><option value="as_sold">كما يباع</option><option value="unspecified">غير محدد</option>
                </select>
              </label>
              {field('المصدر ورقم السجل',food.nutritionSource,(v)=>setFood({...food,nutritionSource:v}),'text','USDA FDC · ID')}
              {field('معرّف المصدر (إن توفر)',food.sourceRecordId,(v)=>setFood({...food,sourceRecordId:v}))}
              <div className="space-y-2">
                <div className="text-[11px] text-[#aaa79b]">مسببات الحساسية الموجودة</div>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  {(['gluten','eggs','fish','milk','nuts'] as string[]).map((key)=>(
                    <label key={key} className="flex items-center gap-1.5">
                      <input type="checkbox" checked={food.allergens.includes(key)} onChange={(e)=>setFood({...food,allergens:e.target.checked?[...food.allergens,key]:food.allergens.filter((x:string)=>x!==key)})}/>
                      {({gluten:'غلوتين',eggs:'بيض',fish:'سمك',milk:'حليب',nuts:'مكسرات'} as Record<string,string>)[key]}
                    </label>
                  ))}
                </div>
              </div>
              <button disabled={busy} className="w-full rounded-xl bg-[#c9a85c] py-3 text-xs font-extrabold text-[#17140d] disabled:opacity-40"><Plus className="ml-1 inline h-4 w-4"/>حفظ كمسودة غير موثقة</button>
            </form>
            <div className="space-y-2">
              <h2 className="text-sm font-bold">سجل المكوّنات · {foods.length}</h2>
              {foods.map((item)=>(
                <div key={item.id} className="rounded-xl border border-[#303329] bg-[#121612] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div><div className="text-xs font-bold">{item.name_ar}</div><div className="mt-1 text-[10px] text-[#88877b]">{item.category} · {item.nutrition_basis} · {item.nutrition_verified?'موثق':'غير موثق'} · {item.active?'نشط':'متوقف'}</div></div>
                    <div className="text-left text-[10px] text-[#c9b783]">{item.price_dzd_per_100} دج/100غ</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!item.nutrition_verified && <button disabled={busy || !item.nutrition_source || item.nutrition_basis==='unspecified'} onClick={()=>void verifyFood(item)} className="rounded-lg border border-[#c9a85c]/40 px-3 py-2 text-[10px] text-[#e5cf94] disabled:opacity-40">اعتماد التوثيق</button>}
                    {item.nutrition_verified && <button disabled={busy} onClick={()=>void toggleFood(item)} className="rounded-lg border border-[#5c9270]/40 px-3 py-2 text-[10px] text-[#a9d0b2]">{item.active?'إيقاف':'تفعيل'}</button>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && isAdmin && tab==='dishes' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
              <h2 className="text-sm font-bold">بناء وصفة</h2>
              {field('اسم الطبق',dishName,setDishName)}
              <div className="grid grid-cols-[1fr_100px_auto] items-end gap-2">
                <label className="block text-[11px] text-[#aaa79b]">المكوّن
                  <select value={dishFoodId} onChange={(e)=>setDishFoodId(e.target.value)} className="mt-1 w-full rounded-lg border border-[#34372e] bg-[#0c100d] p-2.5 text-xs">
                    <option value="">اختر مكوّناً نشطاً</option>{foods.filter((x)=>x.active&&x.nutrition_verified).map((x)=><option key={x.id} value={x.id}>{x.name_ar}</option>)}
                  </select>
                </label>
                {field('الوزن غ',dishGrams,setDishGrams,'number')}
                <button type="button" onClick={addDishIngredient} className="rounded-lg border border-[#c9a85c]/40 p-2.5 text-[#e5cf94]"><Plus size={15}/></button>
              </div>
              <div className="space-y-1">
                {dishIngredients.map((item,index)=>(
                  <div key={index} className="flex items-center justify-between rounded-lg bg-[#0c100d] p-2 text-[11px]">
                    <span>{foods.find((x)=>x.id===item.foodId)?.name_ar ?? 'مكوّن'} · {item.grams}غ</span>
                    <button type="button" onClick={()=>setDishIngredients((prev)=>prev.filter((_,i)=>i!==index))} className="text-[#d48d7f]">حذف</button>
                  </div>
                ))}
              </div>
              <button onClick={()=>void createDish()} disabled={busy||!dishName.trim()||dishIngredients.length===0} className="w-full rounded-xl bg-[#c9a85c] py-3 text-xs font-bold text-[#17140d] disabled:opacity-40">حفظ الوصفة كمسودة</button>
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold">الوصفات المسجلة · {dishes.length}</h2>
              {dishes.map((dish)=>(
                <div key={dish.id} className="rounded-xl border border-[#303329] bg-[#121612] p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{dish.name_ar}</span><button onClick={()=>void toggleDish(dish)} disabled={busy} className="text-[10px] text-[#e5cf94]">{dish.active?'إيقاف':'تفعيل بعد المراجعة'}</button></div>
                  <div className="mt-2 text-[10px] text-[#88877b]">{(dish.ingredients??[]).map((x:any)=>x.name+' '+x.grams+'غ').join(' · ')}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && isAdmin && tab==='zones' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={(e)=>{e.preventDefault();void createZone();}} className="rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
              <h2 className="text-sm font-bold">إضافة منطقة خدمة</h2>
              {field('اسم المنطقة',zone.title,(v)=>setZone({...zone,title:v}))}
              {field('الأحياء المشمولة',zone.areas,(v)=>setZone({...zone,areas:v}))}
              {field('ساعات الخدمة الفعلية',zone.serviceHours,(v)=>setZone({...zone,serviceHours:v}))}
              {field('رسوم التوصيل دج',zone.feeDzd,(v)=>setZone({...zone,feeDzd:v}),'number')}
              <button disabled={busy} className="w-full rounded-xl bg-[#c9a85c] py-3 text-xs font-bold text-[#17140d]">إضافة كنطاق متوقف</button>
            </form>
            <div className="space-y-2">
              <h2 className="text-sm font-bold">نطاقات الخدمة · {zones.length}</h2>
              {zones.map((item)=>(
                <div key={item.id} className="rounded-xl border border-[#303329] bg-[#121612] p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{item.title}</span><button onClick={()=>void toggleZone(item)} disabled={busy} className="text-[10px] text-[#e5cf94]">{item.active?'إيقاف':'تفعيل'}</button></div>
                  <div className="mt-1 text-[10px] text-[#88877b]">{item.areas} · {item.service_hours} · {item.fee_dzd} دج</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && isAdmin && tab==='settings' && (
          <section className="max-w-xl rounded-2xl border border-[#303329] bg-[#121612] p-4 space-y-3">
            <h2 className="text-sm font-bold">إعدادات التسعير والطاقة اليومية</h2>
            {field('المناولة %',String(settings.handling_pct),(v)=>setSettings({...settings,handling_pct:v}),'number')}
            {field('أجر الخدمة لكل وجبة دج',String(settings.service_fee_per_meal),(v)=>setSettings({...settings,service_fee_per_meal:v}),'number')}
            {field('موعد الإغلاق بالساعة 0–23',String(settings.cutoff_hour),(v)=>setSettings({...settings,cutoff_hour:v}),'number')}
            {field('سعة العلب اليومية (0 = إيقاف الطلبات)',String(settings.daily_capacity_boxes),(v)=>setSettings({...settings,daily_capacity_boxes:v}),'number')}
            <button onClick={()=>void saveSettings()} disabled={busy} className="w-full rounded-xl bg-[#c9a85c] py-3 text-xs font-bold text-[#17140d]">حفظ الإعدادات</button>
          </section>
        )}

        <footer className="border-t border-[#292d25] pt-4 text-[10px] leading-5 text-[#77786e]">
          <ShieldCheck className="ml-1 inline h-3.5 w-3.5"/>كل إجراء يُرسل إلى الخادم ويُسجل في سجل التدقيق. لا تُفعّل غذاءً أو منطقة قبل مراجعة بياناتها واعتمادها.
        </footer>
      </div>
    </main>
  );
};
