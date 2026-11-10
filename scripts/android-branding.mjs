import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const res='android/app/src/main/res',icon='assets/branding/toranj-red-v1/duel-toranj-red-apk-1024.png',studio='assets/brand/jolly-panda-icon.png';
export async function applyAndroidBranding(){
 for(const [density,factor]of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]){
  const dir=res+'/mipmap-'+density;await mkdir(dir,{recursive:true});
  for(const file of ['ic_launcher.png','ic_launcher_round.png'])await sharp(icon).resize(Math.round(48*factor)).png().toFile(dir+'/'+file);
  const side=Math.round(108*factor),mark=Math.round(72*factor),offset=Math.round((side-mark)/2);
  const data=await sharp(icon).resize(mark,mark).png().toBuffer();
  await sharp({create:{width:side,height:side,channels:4,background:'#00000000'}}).composite([{input:data,left:offset,top:offset}]).png().toFile(dir+'/ic_launcher_foreground.png');
 }
 await writeFile(res+'/values/ic_launcher_background.xml','<resources><color name="ic_launcher_background">#790B10</color></resources>');
 await mkdir(res+'/drawable-nodpi',{recursive:true});
 const mark=await sharp(studio).resize(180,180,{fit:'contain',background:'#ffffff'}).png().toBuffer();
 await sharp({create:{width:288,height:288,channels:4,background:'#ffffff'}}).composite([{input:mark,left:54,top:54}]).png().toFile(res+'/drawable-nodpi/studio_splash_mark.png');
 await writeFile(res+'/drawable/studio_launch_background.xml','<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@android:color/white"/><item><bitmap android:gravity="center" android:src="@drawable/studio_splash_mark"/></item></layer-list>');
 const styles=res+'/values/styles.xml';let xml=await readFile(styles,'utf8');
 xml=xml.replace(/<style name="AppTheme.NoActionBarLaunch"[\s\S]*?<\/style>/,`<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
 <item name="android:windowBackground">@drawable/studio_launch_background</item>
 <item name="android:background">@android:color/white</item>
 <item name="windowSplashScreenBackground">@android:color/white</item>
 <item name="windowSplashScreenAnimatedIcon">@drawable/studio_splash_mark</item>
 <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
 </style>`);await writeFile(styles,xml);
 console.log('Applied Toranj launcher icons and white Jolly Panda native splash.');
}
