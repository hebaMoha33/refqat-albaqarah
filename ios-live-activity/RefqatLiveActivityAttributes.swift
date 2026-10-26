import Foundation
import ActivityKit


struct RefqatLiveActivityAttributes: ActivityAttributes {

    /*
     البيانات التي لا تتغير أثناء النشاط
    */
    var type: String
    var title: String


    /*
     البيانات التي تتغير أثناء النشاط
     مثل نسبة الإنجاز وعدد الأذكار المكتملة
    */
    struct ContentState: Codable, Hashable {

        var completed: Int

        var total: Int

        /*
         النسبة هنا من 0 إلى 100
         مثال:
         35 = 35%
        */
        var progress: Double
    }
}